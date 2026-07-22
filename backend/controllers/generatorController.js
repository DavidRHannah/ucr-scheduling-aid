import { generateCombinations } from '../utils/generator.js';

export const generateSchedules = async (req, res) => {
  const { courseIds, termCode, lockedSectionIds } = req.body;

  if (!Array.isArray(courseIds) || !termCode) {
    return res.status(400).json({
      message: 'courseIds array and termCode are required.'
    });
  }

  try {
    const schedules = await generateCombinations(courseIds, termCode, lockedSectionIds || [], false);
    res.json({
      total: schedules.length,
      schedules
    });
  } catch (error) {
    console.error('Schedule Generation Error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const generateInvalidSchedules = async (req, res) => {
  const { courseIds, termCode, lockedSectionIds } = req.body;

  if (!Array.isArray(courseIds) || !termCode) {
    return res.status(400).json({
      message: 'courseIds array and termCode are required.'
    });
  }

  try {
    const schedules = await generateCombinations(courseIds, termCode, lockedSectionIds || [], true);
    // Filter to return only schedules that actually have conflicts
    const invalidSchedules = schedules.filter(s => s.totalGapMinutes > 0 || checkConflictsExist(s));
    
    res.json({
      total: invalidSchedules.length,
      schedules: invalidSchedules
    });
  } catch (error) {
    console.error('Invalid Schedule Generation Error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

// Helper to double check if a schedule configuration contains overlapping blocks
const checkConflictsExist = (schedule) => {
  const dayBlocks = { M: [], T: [], W: [], R: [], F: [], S: [], U: [] };
  
  schedule.groups.forEach(g => {
    g.sections.forEach(sec => {
      sec.blocks.forEach(b => {
        dayBlocks[b.day].push(b);
      });
    });
  });

  for (const day of Object.keys(dayBlocks)) {
    const blocks = dayBlocks[day];
    blocks.sort((a, b) => a.start - b.start);
    for (let i = 0; i < blocks.length - 1; i++) {
      if (blocks[i].end > blocks[i + 1].start) {
        return true;
      }
    }
  }
  return false;
};
