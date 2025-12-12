import { prisma } from "@/lib/prisma";

// Dataset scheduling has been removed - only page scheduling is supported now

/**
 * Check and execute scheduled page activations
 * This should be called periodically or on relevant API routes
 */
export async function checkScheduledPageActivations() {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; // HH:MM

    const settings = await prisma.settings.findUnique({
      where: { id: "settings" },
    });

    if (!settings) return { activated: 0 };

    let activated = 0;

    // Check student page activation
    if (settings.studentActivateDate && settings.studentActivateTime) {
      // Parse the scheduled date/time using the stored timezone offset
      const [year, month, day] = settings.studentActivateDate.split('-').map(Number);
      const [hours, minutes] = settings.studentActivateTime.split(':').map(Number);
      
      // Get timezone offset in minutes (positive for timezones ahead of UTC, e.g., 180 for UTC+3)
      // Default to server timezone if not stored (for backward compatibility)
      const timezoneOffsetMinutes = settings.studentActivateTimezoneOffset ?? (now.getTimezoneOffset() * -1);
      
      // Create the scheduled time as if it's in the user's timezone
      // First create in UTC, then subtract the offset to get the actual UTC time
      // Example: 19:45 UTC+3 means 16:45 UTC
      const scheduledDateTimeUTC = Date.UTC(year, month - 1, day, hours, minutes, 0, 0) - (timezoneOffsetMinutes * 60 * 1000);
      const scheduledDateTime = new Date(scheduledDateTimeUTC);
      
      // Only activate if scheduled time has passed and page is not already active
      if (now >= scheduledDateTime && !settings.studentSearchActive) {
        await prisma.settings.update({
          where: { id: "settings" },
          data: {
            studentSearchActive: true,
            studentActivateDate: null,
            studentActivateTime: null,
          },
        });
        activated++;
        console.log(`Activated student search page at ${now.toISOString()}, was scheduled for ${scheduledDateTime.toISOString()}`);
      } else if (now >= scheduledDateTime && settings.studentSearchActive) {
        // Scheduled time has passed but page is already active - clear the scheduled activation
        await prisma.settings.update({
          where: { id: "settings" },
          data: {
            studentActivateDate: null,
            studentActivateTime: null,
          },
        });
        console.log(`Cleared scheduled activation for student page (already active)`);
      }
    }

    // Check lecturer page activation
    if (settings.lecturerActivateDate && settings.lecturerActivateTime) {
      // Parse the scheduled date/time using the stored timezone offset
      const [year, month, day] = settings.lecturerActivateDate.split('-').map(Number);
      const [hours, minutes] = settings.lecturerActivateTime.split(':').map(Number);
      
      // Get timezone offset in minutes (positive for timezones ahead of UTC, e.g., 180 for UTC+3)
      // Default to server timezone if not stored (for backward compatibility)
      const timezoneOffsetMinutes = settings.lecturerActivateTimezoneOffset ?? (now.getTimezoneOffset() * -1);
      
      // Create the scheduled time as if it's in the user's timezone
      // First create in UTC, then subtract the offset to get the actual UTC time
      // Example: 19:45 UTC+3 means 16:45 UTC
      const scheduledDateTimeUTC = Date.UTC(year, month - 1, day, hours, minutes, 0, 0) - (timezoneOffsetMinutes * 60 * 1000);
      const scheduledDateTime = new Date(scheduledDateTimeUTC);
      
      // Only activate if scheduled time has passed and page is not already active
      if (now >= scheduledDateTime && !settings.lecturerSearchActive) {
        await prisma.settings.update({
          where: { id: "settings" },
          data: {
            lecturerSearchActive: true,
            lecturerActivateDate: null,
            lecturerActivateTime: null,
          },
        });
        activated++;
        console.log(`Activated lecturer search page at ${now.toISOString()}, was scheduled for ${scheduledDateTime.toISOString()}`);
      } else if (now >= scheduledDateTime && settings.lecturerSearchActive) {
        // Scheduled time has passed but page is already active - clear the scheduled activation
        await prisma.settings.update({
          where: { id: "settings" },
          data: {
            lecturerActivateDate: null,
            lecturerActivateTime: null,
          },
        });
        console.log(`Cleared scheduled activation for lecturer page (already active)`);
      }
    }

    return { activated };
  } catch (error) {
    console.error("Error checking scheduled page activations:", error);
    return { activated: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Check all scheduled activations (pages only - dataset scheduling removed)
 */
export async function checkAllScheduledActivations() {
  const pageResult = await checkScheduledPageActivations();
  
  return {
    pages: pageResult.activated,
    total: pageResult.activated,
  };
}

