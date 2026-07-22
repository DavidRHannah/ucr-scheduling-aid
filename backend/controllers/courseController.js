import { Course } from '../models/Course.js';
import { Prerequisite } from '../models/Prerequisite.js';
import { Requirement } from '../models/Requirement.js';
import mongoose from 'mongoose';

// Helper to check valid Mongoose ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getCourses = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};

  // Department filter (exact match)
  if (req.query.subject) {
    filter.subject = req.query.subject.toUpperCase();
  }

  // Keyword search (matches subjectCode + courseNumber or title)
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search.trim(), 'i');
    filter.$or = [
      { title: searchRegex },
      { subject: searchRegex },
      { courseNumber: searchRegex }
    ];
  }

  try {
    const totalItems = await Course.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const courses = await Course.find(filter)
      .skip(skip)
      .limit(limit);

    res.json({
      courses,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const getCourseById = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      message: 'Invalid course ID format.'
    });
  }

  try {
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        message: 'Course not found.'
      });
    }
    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const getCoursePrerequisites = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      message: 'Invalid course ID format.'
    });
  }

  try {
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        message: 'Course not found.'
      });
    }

    const prereqs = await Prerequisite.find({ courseId: id })
      .populate('requiredCourseId');

    // Group prerequisites by logicGroup
    const groupsMap = {};
    prereqs.forEach((prereq) => {
      const groupKey = prereq.logicGroup;
      if (!groupsMap[groupKey]) {
        groupsMap[groupKey] = {
          logicGroup: groupKey,
          options: []
        };
      }
      
      groupsMap[groupKey].options.push({
        course: prereq.requiredCourseId,
        minGrade: prereq.minGrade,
        concurrentAllowed: prereq.concurrentAllowed
      });
    });

    res.json({
      courseId: id,
      groups: Object.values(groupsMap)
    });
  } catch (error) {
    console.error('Error fetching prerequisites:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const getRequirements = async (req, res) => {
  try {
    const requirements = await Requirement.find({});
    res.json(requirements);
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};
