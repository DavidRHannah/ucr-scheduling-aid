import { Section } from '../models/Section.js';
import mongoose from 'mongoose';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getSectionsByCourse = async (req, res) => {
  const { courseId } = req.params;
  const { termCode } = req.query;

  if (!isValidObjectId(courseId)) {
    return res.status(400).json({
      message: 'Invalid course ID format.'
    });
  }

  const query = { courseId };
  if (termCode) {
    query.termCode = termCode;
  }

  try {
    const sections = await Section.find(query);
    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections by course:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const getSectionByCrn = async (req, res) => {
  const { crn } = req.params;
  const { termCode } = req.query;

  if (!termCode) {
    return res.status(400).json({
      message: 'termCode query parameter is required to search by CRN.'
    });
  }

  try {
    const section = await Section.findOne({ crn, termCode });
    if (!section) {
      return res.status(404).json({
        message: 'Section not found.'
      });
    }
    res.json(section);
  } catch (error) {
    console.error('Error fetching section by CRN:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const getSectionById = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      message: 'Invalid section ID format.'
    });
  }

  try {
    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({
        message: 'Section not found.'
      });
    }
    res.json(section);
  } catch (error) {
    console.error('Error fetching section:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const getLinkedSections = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      message: 'Invalid section ID format.'
    });
  }

  try {
    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({
        message: 'Section not found.'
      });
    }

    // If there is no link identifier, return empty
    if (!section.linkIdentifier) {
      return res.json({
        linkIdentifier: null,
        linkedSections: []
      });
    }

    // Find other sections with same linkIdentifier and termCode, excluding itself
    const linkedSections = await Section.find({
      linkIdentifier: section.linkIdentifier,
      termCode: section.termCode,
      _id: { $ne: section._id }
    });

    res.json({
      linkIdentifier: section.linkIdentifier,
      linkedSections
    });
  } catch (error) {
    console.error('Error fetching linked sections:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};
