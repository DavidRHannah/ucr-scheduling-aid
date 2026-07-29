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

  // Keyword search (matches combined subject + courseNumber, or title, subject, courseNumber)
  if (req.query.search) {
    const rawSearch = req.query.search.trim();
    const searchRegex = new RegExp(rawSearch, 'i');

    const orConditions = [
      { title: searchRegex },
      { subject: searchRegex },
      { courseNumber: searchRegex },
    ];

    // Check if query is structured like [subject][courseNumber] or [subject] [courseNumber]
    // e.g. "CS 100", "CS100", "MATH 009B", "math9b", "EE 020"
    const comboMatch = rawSearch.match(/^([a-zA-Z]{2,5})\s*([0-9]{1,4}[a-zA-Z]*)$/);
    if (comboMatch) {
      const subjectPart = comboMatch[1];
      const numPart = comboMatch[2];
      // Normalize leading zeros so "10A" matches "010A" and vice versa
      const strippedNum = numPart.replace(/^0+/, "");
      const numRegex = new RegExp(`^0*${strippedNum}$`, "i");

      orConditions.unshift({
        subject: new RegExp(`^${subjectPart}$`, "i"),
        courseNumber: numRegex,
      });
    }

    filter.$or = orConditions;
  }

  try {
    const totalItems = await Course.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const courses = await Course.find(filter)
      .skip(skip)
      .limit(limit)
      .lean();

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
