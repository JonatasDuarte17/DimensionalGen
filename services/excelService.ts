import ExcelJS from 'exceljs';
import { ProcessingStats } from '../types';

// Helper to count decimals from a number or string representation
const countDecimals = (value: number | string): number => {
  const str = value.toString().replace(',', '.');
  if (str.indexOf('.') === -1) return 0;
  return str.split('.')[1].length || 0;
};

// Helper to parse diverse number formats
const parseNumber = (val: any): number | null => {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    if (!val.trim()) return null;
    const normalized = val.replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  }
  return null;
};

// Helper to safely extract value from ExcelJS cell
const getCellValue = (cell: ExcelJS.Cell): string | number | null => {
  if (cell.value === null || cell.value === undefined) return null;
  
  if (typeof cell.value === 'object') {
    // Handle formulas: { formula: '...', result: val }
    if ('result' in cell.value && cell.value.result !== undefined) {
      if (typeof cell.value.result === 'object') return null;
      return cell.value.result as string | number;
    }
    // Handle rich text: { richText: [...] }
    if ('richText' in cell.value && Array.isArray(cell.value.richText)) {
      return cell.value.richText.map(t => t.text).join('');
    }
    // Handle Hyperlinks: { text: '...', hyperlink: '...' }
    if ('text' in cell.value && typeof cell.value.text === 'string') {
        return cell.value.text;
    }
    return null;
  }
  
  return cell.value as string | number;
};

// --- ANGLE HELPERS ---

// Parse 30°15' or 30.25 into Decimal Degrees
const parseAngleToDecimal = (val: string | number): number | null => {
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return null;

  // Check for Degree + Minute format (e.g. 30°15' or 30 15)
  // Regex looks for Number + optional symbol + Number + optional symbol
  const dmsRegex = /^(-?\d+)[°\s]+(\d+)/;
  const match = val.match(dmsRegex);

  if (match) {
    const deg = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    const sign = deg < 0 ? -1 : 1;
    return Math.abs(deg) + (min / 60) * sign;
  }

  // Fallback to simple decimal parsing
  return parseNumber(val);
};

// Format Decimal Degrees back to DD°MM' string
const formatAngle = (decimalDeg: number): string => {
  const sign = decimalDeg < 0 ? '-' : '';
  const absVal = Math.abs(decimalDeg);
  const deg = Math.floor(absVal);
  const minPart = (absVal - deg) * 60;
  const min = Math.round(minPart);

  // Pad with leading zeros: 05°02'
  const degStr = deg.toString().padStart(2, '0');
  const minStr = min.toString().padStart(2, '0');

  return `${sign}${degStr}°${minStr}'`;
};

// --- RANDOMIZATION HELPERS ---

const randomizeInSpec = (min: number, max: number, precision: number): number => {
  const tolerance = max - min;
  if (tolerance <= 0) return min;

  // Narrow buffer to ensure we don't accidentally hit the edge due to floating point
  const safeMin = min + (tolerance * 0.05);
  const safeMax = max - (tolerance * 0.05);
  
  if (safeMax <= safeMin) {
      const randomVal = Math.random() * (max - min) + min;
      return parseFloat(randomVal.toFixed(precision));
  }
  
  const randomVal = Math.random() * (safeMax - safeMin) + safeMin;
  return parseFloat(randomVal.toFixed(precision));
};

const randomizeOutSpec = (originalValue: number, min: number, max: number, precision: number, isAngle: boolean = false): number => {
  // Logic: Change only the last decimal/minute digit
  
  let step: number;
  if (isAngle) {
    // For angles, 1 unit of precision usually means 1 minute (1/60th of a degree)
    // precision is 0 in our logic for angles, but effectively we want to shift by minutes.
    step = 1 / 60; 
  } else {
    step = Math.pow(10, -precision);
  }

  let newValue = originalValue;
  let attempts = 0;
  
  while (attempts < 50) {
    // Generate a small integer shift (-3 to +3, excluding 0)
    let randomInt = Math.floor(Math.random() * 7) - 3; 
    if (randomInt === 0) randomInt = 1; 

    const randomStep = randomInt * step; 
    
    // Calculate candidate
    let candidate = originalValue + randomStep;

    // Fix floating point issues for display
    if (!isAngle) {
       candidate = parseFloat(candidate.toFixed(precision));
    }

    const isStillOut = candidate > max || candidate < min;
    // We prefer to keep it on the same side (e.g. if it was > max, stay > max)
    const directionPreserved = (originalValue > max && candidate > max) || (originalValue < min && candidate < min);

    // Accept if it's still out of spec and matches direction (or if we can't match direction easily, just out)
    if (isStillOut && (directionPreserved || attempts > 20) && candidate !== originalValue) {
      newValue = candidate;
      break;
    }
    attempts++;
  }
  return newValue;
};

// --- MAIN PROCESS ---

const processSheet = (sheet: ExcelJS.Worksheet, stats: ProcessingStats, targetCols: number[]) => {
  let currentMax: number | null = null;
  let currentMin: number | null = null;
  
  // ExcelJS uses 1-based indexing
  const COL_DESC = 2; // B (Description)
  const COL_UT = 3;   // C (Upper Tolerance)
  const COL_LT = 4;   // D (Lower Tolerance)
  const excelTargetCols = targetCols.map(c => c + 1); // Convert 0-based to 1-based

  // Iterate over all rows that have data
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    stats.totalRows++;

    // 1. Identify Row Type (Angle vs Linear) based on Column B
    const cellDesc = row.getCell(COL_DESC);
    const descVal = getCellValue(cellDesc);
    let isAngle = false;
    if (typeof descVal === 'string') {
        const text = descVal.trim().toLowerCase();
        isAngle = text.startsWith('ang') || text.includes('°');
    }

    // 2. Check for Tolerance definitions
    const cellMax = row.getCell(COL_UT);
    const cellMin = row.getCell(COL_LT);
    const rawMax = getCellValue(cellMax);
    const rawMin = getCellValue(cellMin);
    
    // Parse Tolerances
    let valMax: number | null = null;
    let valMin: number | null = null;

    if (isAngle) {
        // For angles, tolerances might be in degrees or minutes or DD°MM'
        // Assuming tolerances in C/D are compatible with the values in E/F/G
        // If the values in E/F/G are DD°MM', tolerances usually are too or decimal degrees.
        // We'll try to parse as angle first
        valMax = parseAngleToDecimal(rawMax as string | number);
        valMin = parseAngleToDecimal(rawMin as string | number);
    } else {
        valMax = parseNumber(rawMax);
        valMin = parseNumber(rawMin);
    }

    // Latch values (Basic state machine for merged vertical cells describing a block)
    if (valMax !== null) currentMax = valMax;
    if (valMin !== null) currentMin = valMin;

    // 3. Process Target Columns
    if (currentMax !== null && currentMin !== null) {
      excelTargetCols.forEach((colIndex) => {
        const cell = row.getCell(colIndex);
        
        // Skip if cell is a merged cell follower
        if (cell.isMerged && cell.address !== cell.master.address) return;

        const cellValueRaw = getCellValue(cell);

        if (cellValueRaw !== null && cellValueRaw !== '') {
           // --- PRECISION STRATEGY ---
           // Linear: Strictly 2 decimal places.
           // Angle:  0 decimal places for the randomizer (integers), but processed as minutes internally if needed.
           const precision = isAngle ? 0 : 2; 

           // Parse Cell Value
           let singleVal: number | null = null;
           if (isAngle) {
               singleVal = parseAngleToDecimal(cellValueRaw as string | number);
           } else {
               singleVal = parseNumber(cellValueRaw);
           }
           
           // Simple clean string check
           const isCleanNumberString = typeof cellValueRaw === 'string' && /^-?\d*([.,]\d+)?\s*$/.test(cellValueRaw.trim());
           const isNumberType = typeof cellValueRaw === 'number';

           // CASE A: Single Value
           if ((isNumberType || isCleanNumberString || (isAngle && typeof cellValueRaw === 'string')) && singleVal !== null) {
              
              const isOut = singleVal > currentMax! || singleVal < currentMin!;
              let newVal: number;

              if (isOut) {
                newVal = randomizeOutSpec(singleVal, currentMin!, currentMax!, precision, isAngle);
                stats.outOfSpecCount++;
              } else {
                newVal = randomizeInSpec(currentMin!, currentMax!, precision);
                stats.inSpecCount++;
              }

              if (isAngle) {
                  // Format back to DD°MM'
                  cell.value = formatAngle(newVal);
              } else {
                  // Linear: Set as number
                  cell.value = newVal;
                  // FORCE 2 DECIMAL PLACES VISUALLY
                  cell.numFmt = '0.00';
              }
              stats.processedCells++;
           }
           // CASE B: Complex String (e.g. "10.5 / 10.8" or multiple lines)
           else if (typeof cellValueRaw === 'string') {
              // Regex: Angles (DD°MM') OR Standard Numbers
              // If Angle, we look for digits + ° + digits + '
              // If Linear, we look for digits + . + digits
              
              let pattern: RegExp;
              if (isAngle) {
                  pattern = /-?\d+[°\s]\d+'?/g;
              } else {
                  pattern = /-?\d+(?:[.,]\d+)?/g;
              }
              
              if (pattern.test(cellValueRaw)) {
                 let cellModified = false;
                 
                 const newText = cellValueRaw.replace(pattern, (match) => {
                    let val: number | null;
                    if (isAngle) {
                        val = parseAngleToDecimal(match);
                    } else {
                        val = parseNumber(match);
                    }

                    if (val === null) return match;

                    const isOut = val > currentMax! || val < currentMin!;
                    let newVal: number;

                    if (isOut) {
                      newVal = randomizeOutSpec(val, currentMin!, currentMax!, precision, isAngle);
                      stats.outOfSpecCount++;
                    } else {
                      newVal = randomizeInSpec(currentMin!, currentMax!, precision);
                      stats.inSpecCount++;
                    }
                    
                    cellModified = true;
                    
                    if (isAngle) {
                        return formatAngle(newVal);
                    } else {
                        // For complex strings in Linear, we return the string representation
                        // with exactly 2 decimal places.
                        // Preserve comma if input used comma
                        if (match.includes(',')) {
                            return newVal.toFixed(2).replace('.', ',');
                        }
                        return newVal.toFixed(2);
                    }
                 });

                 if (cellModified) {
                    cell.value = newText;
                    stats.processedCells++; 
                 }
              }
           }
        }
      });
    }
  });
};

export const processExcelBuffer = async (buffer: ArrayBuffer, targetCols: number[] = [4, 5, 6]): Promise<{ buffer: ArrayBuffer; stats: ProcessingStats }> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  let stats: ProcessingStats = {
    totalRows: 0,
    processedCells: 0,
    outOfSpecCount: 0,
    inSpecCount: 0,
  };

  let validSheetsFound = 0;

  workbook.eachSheet((sheet) => {
    if (sheet.rowCount > 0) {
      validSheetsFound++;
      processSheet(sheet, stats, targetCols);
    }
  });

  if (validSheetsFound === 0) {
    throw new Error('Nenhuma planilha válida com dados encontrada.');
  }

  const outBuffer = await workbook.xlsx.writeBuffer();
  return { buffer: outBuffer, stats };
};
