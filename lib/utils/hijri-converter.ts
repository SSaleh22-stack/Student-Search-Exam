/**
 * Convert Hijri (Islamic) date to Gregorian date
 * Uses approximate conversion algorithm
 */
export function hijriToGregorian(hijriYear: number, hijriMonth: number, hijriDay: number): Date {
  // More accurate Hijri to Gregorian conversion
  // Using the standard algorithm with proper leap year calculation
  
  const hijriEpoch = new Date(622, 6, 15); // July 15, 622 CE (Julian calendar)
  
  // Calculate days since Hijri epoch
  let totalDays = 0;
  
  // Add days for complete years
  for (let y = 1; y < hijriYear; y++) {
    // Check if year is leap (11 leap years in 30-year cycle)
    const remainder = y % 30;
    const isLeap = (remainder === 2 || remainder === 5 || remainder === 7 || 
                   remainder === 10 || remainder === 13 || remainder === 16 || 
                   remainder === 18 || remainder === 21 || remainder === 24 || 
                   remainder === 26 || remainder === 29);
    totalDays += isLeap ? 355 : 354;
  }
  
  // Add days for complete months in current year
  const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
  const remainder = hijriYear % 30;
  const isLeap = (remainder === 2 || remainder === 5 || remainder === 7 || 
                 remainder === 10 || remainder === 13 || remainder === 16 || 
                 remainder === 18 || remainder === 21 || remainder === 24 || 
                 remainder === 26 || remainder === 29);
  
  for (let m = 1; m < hijriMonth; m++) {
    if (m === 12 && isLeap) {
      totalDays += 30; // 12th month (Dhu al-Hijjah) has 30 days in leap years
    } else {
      totalDays += monthLengths[m - 1];
    }
  }
  
  // Add days in current month
  totalDays += hijriDay - 1;
  
  // Convert to Gregorian
  const resultDate = new Date(hijriEpoch);
  resultDate.setDate(resultDate.getDate() + totalDays);
  
  return resultDate;
}

/**
 * Parse Hijri date string (YYYY-MM-DD format) and convert to Gregorian
 */
export function parseHijriDate(dateStr: string): string | null {
  // Check if it's a Hijri date (year > 1000 and < 2000 typically indicates Hijri)
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  
  // Hijri years are typically 1300-1500 range
  // If year is in this range, assume it's Hijri
  if (year >= 1200 && year < 1600) {
    try {
      const gregorianDate = hijriToGregorian(year, month, day);
      const gregorianYear = gregorianDate.getFullYear();
      const gregorianMonth = String(gregorianDate.getMonth() + 1).padStart(2, "0");
      const gregorianDay = String(gregorianDate.getDate()).padStart(2, "0");
      return `${gregorianYear}-${gregorianMonth}-${gregorianDay}`;
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

/**
 * Convert Arabic numerals to Western numerals
 */
const arabicToWestern: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export function convertArabicNumerals(str: string): string {
  return str.split('').map(char => arabicToWestern[char] || char).join('');
}

/**
 * Parse Arabic time format (e.g., "٨:٠٠ ص" = "8:00 AM" or " ص٠٨:٠٠" = "8:00 AM")
 */
export function parseArabicTime(timeStr: string): string | null {
  if (!timeStr || !timeStr.trim()) return null;
  
  // Convert Arabic numerals to Western
  const westernTime = convertArabicNumerals(timeStr.trim());
  
  // Match time patterns:
  // - "8:00 ص" or "8:00 م" (time then AM/PM)
  // - " ص8:00" or " م8:00" (AM/PM then time)
  // - " ص08:00" (space, AM/PM, then time with leading zero)
  // - "14:30" (24-hour format)
  let timeMatch = westernTime.match(/(\d{1,2}):(\d{2})\s*([صم])?/);
  
  // If not found, try pattern with AM/PM before time
  if (!timeMatch) {
    timeMatch = westernTime.match(/([صم])\s*(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      // Rearrange: AM/PM is first, then hours, then minutes
      const ampm = timeMatch[1];
      const hours = parseInt(timeMatch[2], 10);
      const minutes = timeMatch[3];
      
      let finalHours = hours;
      if (ampm === 'ص') {
        // ص = AM
        if (finalHours === 12) finalHours = 0;
      } else if (ampm === 'م') {
        // م = PM
        if (finalHours !== 12) finalHours += 12;
      }
      
      return `${String(finalHours).padStart(2, "0")}:${minutes}`;
    }
  }
  
  if (!timeMatch) return null;
  
  let hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2];
  const ampm = timeMatch[3]; // ص = AM, م = PM
  
  // Handle AM/PM
  if (ampm === 'ص') {
    // ص = AM
    if (hours === 12) hours = 0;
  } else if (ampm === 'م') {
    // م = PM
    if (hours !== 12) hours += 12;
  }
  
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

/**
 * Convert Gregorian date to Hijri date
 */
export function gregorianToHijri(gregorianDate: Date): { year: number; month: number; day: number } {
  const hijriEpoch = new Date(622, 6, 15); // July 15, 622 CE
  
  // Calculate days since Hijri epoch
  const daysSinceEpoch = Math.floor((gregorianDate.getTime() - hijriEpoch.getTime()) / (1000 * 60 * 60 * 24));
  
  let remainingDays = daysSinceEpoch;
  let hijriYear = 1;
  
  // Calculate Hijri year
  while (remainingDays > 0) {
    const remainder = hijriYear % 30;
    const isLeap = (remainder === 2 || remainder === 5 || remainder === 7 || 
                   remainder === 10 || remainder === 13 || remainder === 16 || 
                   remainder === 18 || remainder === 21 || remainder === 24 || 
                   remainder === 26 || remainder === 29);
    const yearDays = isLeap ? 355 : 354;
    
    if (remainingDays >= yearDays) {
      remainingDays -= yearDays;
      hijriYear++;
    } else {
      break;
    }
  }
  
  // Calculate Hijri month
  const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
  const remainder = hijriYear % 30;
  const isLeap = (remainder === 2 || remainder === 5 || remainder === 7 || 
                 remainder === 10 || remainder === 13 || remainder === 16 || 
                 remainder === 18 || remainder === 21 || remainder === 24 || 
                 remainder === 26 || remainder === 29);
  
  let hijriMonth = 1;
  let monthDays = 0;
  
  for (let m = 0; m < 12; m++) {
    const daysInMonth = (m === 11 && isLeap) ? 30 : monthLengths[m];
    if (remainingDays >= daysInMonth) {
      remainingDays -= daysInMonth;
      hijriMonth++;
    } else {
      break;
    }
  }
  
  // Calculate Hijri day
  const hijriDay = remainingDays + 1;
  
  return { year: hijriYear, month: hijriMonth, day: hijriDay };
}

/**
 * Format Gregorian date as Hijri date string
 */
export function formatHijriDate(gregorianDateStr: string): string {
  try {
    const date = new Date(gregorianDateStr);
    if (isNaN(date.getTime())) {
      return gregorianDateStr; // Return original if invalid
    }
    
    const hijri = gregorianToHijri(date);
    return `${hijri.year}-${String(hijri.month).padStart(2, "0")}-${String(hijri.day).padStart(2, "0")}`;
  } catch (e) {
    return gregorianDateStr; // Return original on error
  }
}

/**
 * Extract date from Excel cell text, preserving Hijri dates
 * This function parses various date formats and keeps Hijri dates as-is (doesn't convert to Gregorian)
 * @param cellText The text value from Excel cell (as displayed in Excel)
 * @returns Date string in YYYY-MM-DD format (Hijri or Gregorian, preserved as-is) or null if cannot parse
 */
export function extractDateFromCellText(cellText: string | null | undefined): string | null {
  if (!cellText || !cellText.trim()) {
    return null;
  }
  
  // Convert Arabic numerals to Western numerals first
  const westernText = convertArabicNumerals(cellText.trim());
  
  // Try various date formats:
  // 1. YYYY-MM-DD (e.g., "1447-07-01" or "2025-01-15")
  let match = westernText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    
    // Validate month and day
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${match[1]}-${match[2]}-${match[3]}`; // Keep as-is (Hijri or Gregorian)
    }
  }
  
  // 2. YYYY/MM/DD (e.g., "1447/07/01" or "2025/01/15")
  match = westernText.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${match[1]}-${match[2]}-${match[3]}`; // Convert to YYYY-MM-DD format
    }
  }
  
  // 3. DD/MM/YYYY or MM/DD/YYYY (e.g., "01/07/1447" or "15/01/2025" or "07/01/1447")
  // Try to distinguish: if first number > 12, it's likely DD/MM/YYYY; if second > 12, it's likely MM/DD/YYYY
  match = westernText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const first = parseInt(match[1], 10);
    const second = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    let month: number, day: number;
    
    // If first number > 12, it must be DD/MM/YYYY (day can be > 12, month cannot)
    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    }
    // If second number > 12, it must be MM/DD/YYYY (month can't be > 12, day can)
    else if (second > 12 && first <= 12) {
      month = first;
      day = second;
    }
    // If both <= 12, we can't tell, but for Hijri dates (year 1200-1600), assume DD/MM/YYYY
    // For Gregorian dates (year >= 1600), assume MM/DD/YYYY (US format)
    else if (first <= 12 && second <= 12) {
      if (year >= 1200 && year < 1600) {
        // Hijri date - assume DD/MM/YYYY (more common in regions using Hijri)
        day = first;
        month = second;
      } else {
        // Gregorian date - assume MM/DD/YYYY (US format) or DD/MM/YYYY (international)
        // Default to DD/MM/YYYY as it's more common internationally
        day = first;
        month = second;
      }
    } else {
      // Invalid - skip
      return null;
    }
    
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  
  // 5. YYYY.MM.DD (e.g., "1447.07.01" or "2025.01.15")
  match = westernText.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  
  // 6. Try to match any 4-digit year followed by month and day
  match = westernText.match(/(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${match[1]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  
  return null; // Cannot parse
}

