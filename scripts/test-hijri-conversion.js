// Test Hijri date conversion
function hijriToGregorian(hijriYear, hijriMonth, hijriDay) {
  // More accurate Hijri to Gregorian conversion
  // Using the standard algorithm
  
  const hijriEpoch = new Date(622, 6, 15); // July 15, 622 CE (Julian)
  
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
      totalDays += 30; // 12th month has 30 days in leap years
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

function parseHijriDate(dateStr) {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  
  // Hijri years are typically 1300-1500 range
  if (year >= 1200 && year < 1600) {
    try {
      const gregorianDate = hijriToGregorian(year, month, day);
      const gregorianYear = gregorianDate.getFullYear();
      const gregorianMonth = String(gregorianDate.getMonth() + 1).padStart(2, "0");
      const gregorianDay = String(gregorianDate.getDate()).padStart(2, "0");
      return `${gregorianYear}-${gregorianMonth}-${gregorianDay}`;
    } catch (e) {
      console.error("Error converting:", e);
      return null;
    }
  }
  
  return null;
}

// Test
const testDate = "1447-07-01";
console.log(`Hijri date: ${testDate}`);
const converted = parseHijriDate(testDate);
console.log(`Gregorian date: ${converted}`);






