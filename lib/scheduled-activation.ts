import { prisma } from "@/lib/prisma";

/**
 * Check and execute scheduled dataset activations
 * This should be called periodically or on relevant API routes
 */
export async function checkScheduledDatasetActivations() {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; // HH:MM

    // Find datasets that are scheduled for activation and the time has arrived
    const scheduledDatasets = await prisma.dataset.findMany({
      where: {
        activateDate: { not: null },
        activateTime: { not: null },
        isActive: false, // Only check inactive datasets
      },
    });

    const datasetsToActivate: string[] = [];

    for (const dataset of scheduledDatasets) {
      if (!dataset.activateDate || !dataset.activateTime) continue;

      // Check if scheduled date/time has passed
      const scheduledDateTime = new Date(`${dataset.activateDate}T${dataset.activateTime}`);
      
      if (now >= scheduledDateTime) {
        datasetsToActivate.push(dataset.id);
      }
    }

    // Activate all datasets whose scheduled time has arrived
    if (datasetsToActivate.length > 0) {
      // First, deactivate all other datasets of the same type
      const datasetsToUpdate = await prisma.dataset.findMany({
        where: { id: { in: datasetsToActivate } },
        select: { type: true },
      });

      const types = [...new Set(datasetsToUpdate.map(d => d.type).filter(Boolean))];

      for (const type of types) {
        await prisma.dataset.updateMany({
          where: {
            type: type || null,
            id: { notIn: datasetsToActivate },
          },
          data: { isActive: false },
        });
      }

      // Activate the scheduled datasets
      await prisma.dataset.updateMany({
        where: { id: { in: datasetsToActivate } },
        data: {
          isActive: true,
          activateDate: null,
          activateTime: null, // Clear scheduled activation after activating
        },
      });

      console.log(`Activated ${datasetsToActivate.length} scheduled dataset(s)`);
    }

    return { activated: datasetsToActivate.length };
  } catch (error) {
    console.error("Error checking scheduled dataset activations:", error);
    return { activated: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

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
    if (settings.studentActivateDate && settings.studentActivateTime && !settings.studentSearchActive) {
      const scheduledDateTime = new Date(`${settings.studentActivateDate}T${settings.studentActivateTime}`);
      
      if (now >= scheduledDateTime) {
        await prisma.settings.update({
          where: { id: "settings" },
          data: {
            studentSearchActive: true,
            studentActivateDate: null,
            studentActivateTime: null,
          },
        });
        activated++;
        console.log("Activated student search page");
      }
    }

    // Check lecturer page activation
    if (settings.lecturerActivateDate && settings.lecturerActivateTime && !settings.lecturerSearchActive) {
      const scheduledDateTime = new Date(`${settings.lecturerActivateDate}T${settings.lecturerActivateTime}`);
      
      if (now >= scheduledDateTime) {
        await prisma.settings.update({
          where: { id: "settings" },
          data: {
            lecturerSearchActive: true,
            lecturerActivateDate: null,
            lecturerActivateTime: null,
          },
        });
        activated++;
        console.log("Activated lecturer search page");
      }
    }

    return { activated };
  } catch (error) {
    console.error("Error checking scheduled page activations:", error);
    return { activated: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Check all scheduled activations (datasets and pages)
 */
export async function checkAllScheduledActivations() {
  const datasetResult = await checkScheduledDatasetActivations();
  const pageResult = await checkScheduledPageActivations();
  
  return {
    datasets: datasetResult.activated,
    pages: pageResult.activated,
    total: datasetResult.activated + pageResult.activated,
  };
}

