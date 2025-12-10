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

