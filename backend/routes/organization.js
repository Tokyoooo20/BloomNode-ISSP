const express = require('express');
const router = express.Router();
const Campus = require('../models/Campus');
const Faculty = require('../models/Faculty');
const Office = require('../models/Office');
const Unit = require('../models/Unit');
const Program = require('../models/Program');
const UniversityLevelOffice = require('../models/UniversityLevelOffice');
const YearCycle = require('../models/YearCycle');
const Request = require('../models/Request');
const auth = require('../middleware/auth');
const { logAuditEvent } = require('../utils/auditLogger');

// ==================== CAMPUSES ====================

// GET all campuses (public for signup, auth for admin)
router.get('/campuses', async (req, res) => {
  try {
    const campuses = await Campus.find().sort({ order: 1, name: 1 });
    res.json(campuses);
  } catch (error) {
    console.error('Error fetching campuses:', error);
    res.status(500).json({ message: 'Error fetching campuses', error: error.message });
  }
});

// GET single campus
router.get('/campuses/:id', auth, async (req, res) => {
  try {
    const campus = await Campus.findById(req.params.id);
    if (!campus) {
      return res.status(404).json({ message: 'Campus not found' });
    }
    res.json(campus);
  } catch (error) {
    console.error('Error fetching campus:', error);
    res.status(500).json({ message: 'Error fetching campus', error: error.message });
  }
});

// POST create campus
router.post('/campuses', auth, async (req, res) => {
  try {
    const { name, isMain, isActive, order } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Campus name is required' });
    }

    const campus = new Campus({
      name: name.trim(),
      isMain: isMain || false,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    await campus.save();

    await logAuditEvent({
      actor: req.user,
      action: 'campus_created',
      description: `Created campus: ${campus.name}`,
      target: { type: 'campus', id: campus._id.toString(), name: campus.name }
    });

    res.status(201).json(campus);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Campus with this name already exists' });
    }
    console.error('Error creating campus:', error);
    res.status(500).json({ message: 'Error creating campus', error: error.message });
  }
});

// PUT update campus
router.put('/campuses/:id', auth, async (req, res) => {
  try {
    const { name, isMain, isActive, order } = req.body;
    const campus = await Campus.findById(req.params.id);
    
    if (!campus) {
      return res.status(404).json({ message: 'Campus not found' });
    }

    const oldName = campus.name;
    if (name) campus.name = name.trim();
    if (isMain !== undefined) campus.isMain = isMain;
    if (isActive !== undefined) campus.isActive = isActive;
    if (order !== undefined) campus.order = order;

    await campus.save();

    await logAuditEvent({
      actor: req.user,
      action: 'campus_updated',
      description: `Updated campus: ${oldName}${name && name !== oldName ? ` → ${name}` : ''}`,
      target: { type: 'campus', id: campus._id.toString(), name: campus.name }
    });

    res.json(campus);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Campus with this name already exists' });
    }
    console.error('Error updating campus:', error);
    res.status(500).json({ message: 'Error updating campus', error: error.message });
  }
});

// DELETE campus
router.delete('/campuses/:id', auth, async (req, res) => {
  try {
    const campus = await Campus.findById(req.params.id);
    if (!campus) {
      return res.status(404).json({ message: 'Campus not found' });
    }

    // Check if campus has associated faculties, offices, or programs
    const facultyCount = await Faculty.countDocuments({ campus: campus._id });
    const officeCount = await Office.countDocuments({ campus: campus._id });
    
    if (facultyCount > 0 || officeCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete campus. It has ${facultyCount} faculties and ${officeCount} offices associated with it.` 
      });
    }

    await Campus.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      actor: req.user,
      action: 'campus_deleted',
      description: `Deleted campus: ${campus.name}`,
      target: { type: 'campus', id: campus._id.toString(), name: campus.name }
    });

    res.json({ message: 'Campus deleted successfully' });
  } catch (error) {
    console.error('Error deleting campus:', error);
    res.status(500).json({ message: 'Error deleting campus', error: error.message });
  }
});

// ==================== FACULTIES ====================

// GET all faculties (public for signup, auth for admin)
router.get('/faculties', async (req, res) => {
  try {
    const { campusId } = req.query;
    const query = campusId ? { campus: campusId } : {};
    const faculties = await Faculty.find(query)
      .populate('campus', 'name')
      .sort({ order: 1, name: 1 });
    res.json(faculties);
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ message: 'Error fetching faculties', error: error.message });
  }
});

// GET single faculty
router.get('/faculties/:id', auth, async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id).populate('campus', 'name');
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    res.json(faculty);
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ message: 'Error fetching faculty', error: error.message });
  }
});

// POST create faculty
router.post('/faculties', auth, async (req, res) => {
  const { name, campus, isActive, order } = req.body;
  
  try {
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Faculty name is required' });
    }
    if (!campus) {
      return res.status(400).json({ message: 'Campus is required' });
    }

    // Check if faculty with same name already exists in this campus
    const existingFaculty = await Faculty.findOne({ 
      name: name.trim(), 
      campus: campus 
    });
    
    if (existingFaculty) {
      const campusDoc = await Campus.findById(campus);
      const campusName = campusDoc ? campusDoc.name : 'this campus';
      return res.status(400).json({ 
        message: `Faculty with this name already exists in ${campusName}` 
      });
    }

    const faculty = new Faculty({
      name: name.trim(),
      campus,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    await faculty.save();
    await faculty.populate('campus', 'name');

    await logAuditEvent({
      actor: req.user,
      action: 'faculty_created',
      description: `Created faculty: ${faculty.name}`,
      target: { type: 'faculty', id: faculty._id.toString(), name: faculty.name }
    });

    res.status(201).json(faculty);
  } catch (error) {
    if (error.code === 11000) {
      // MongoDB duplicate key error - check if it's actually a duplicate in the same campus
      const existingFaculty = await Faculty.findOne({ 
        name: name ? name.trim() : ''
      }).populate('campus', 'name');
      
      if (existingFaculty && name && campus) {
        const currentCampus = await Campus.findById(campus);
        const currentCampusName = currentCampus ? currentCampus.name : 'this campus';
        const existingCampusName = existingFaculty.campus ? existingFaculty.campus.name : 'another campus';
        
        // Check if it's the same campus
        if (existingFaculty.campus && existingFaculty.campus._id.toString() === campus.toString()) {
          return res.status(400).json({ 
            message: `Faculty with this name already exists in ${currentCampusName}` 
          });
        } else {
          // Different campus - old unique index on 'name' is blocking us
          // Try to automatically fix the index
          try {
            const FacultyModel = Faculty.collection;
            // Try to drop the old index
            await FacultyModel.dropIndex('name_1').catch(() => {
              // Index might not exist or already dropped
            });
            
            // Now try saving again
            const faculty = new Faculty({
              name: name.trim(),
              campus,
              isActive: isActive !== undefined ? isActive : true,
              order: order || 0
            });
            
            await faculty.save();
            await faculty.populate('campus', 'name');

            await logAuditEvent({
              actor: req.user,
              action: 'faculty_created',
              description: `Created faculty: ${faculty.name}`,
              target: { type: 'faculty', id: faculty._id.toString(), name: faculty.name }
            });

            return res.status(201).json(faculty);
          } catch (retryError) {
            return res.status(400).json({ 
              message: `Database index issue detected. A faculty with this name exists in ${existingCampusName}, but you're trying to create it in ${currentCampusName}. Please run: node backend/scripts/fixFacultyIndex.js to fix the database indexes. Error: ${retryError.message}` 
            });
          }
        }
      }
      return res.status(400).json({ message: 'Faculty with this name already exists' });
    }
    console.error('Error creating faculty:', error);
    res.status(500).json({ message: 'Error creating faculty', error: error.message });
  }
});

// PUT update faculty
router.put('/faculties/:id', auth, async (req, res) => {
  try {
    const { name, campus, isActive, order } = req.body;
    const faculty = await Faculty.findById(req.params.id);
    
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    const targetCampus = campus || faculty.campus;
    const targetName = name ? name.trim() : faculty.name;

    // Check if another faculty with same name exists in the target campus (excluding current faculty)
    if (name || campus) {
      const existingFaculty = await Faculty.findOne({ 
        name: targetName, 
        campus: targetCampus,
        _id: { $ne: faculty._id } // Exclude current faculty
      });
      
      if (existingFaculty) {
        const campusDoc = await Campus.findById(targetCampus);
        const campusName = campusDoc ? campusDoc.name : 'this campus';
        return res.status(400).json({ 
          message: `Faculty with this name already exists in ${campusName}` 
        });
      }
    }

    const oldName = faculty.name;
    if (name) faculty.name = name.trim();
    if (campus) faculty.campus = campus;
    if (isActive !== undefined) faculty.isActive = isActive;
    if (order !== undefined) faculty.order = order;

    await faculty.save();
    await faculty.populate('campus', 'name');

    await logAuditEvent({
      actor: req.user,
      action: 'faculty_updated',
      description: `Updated faculty: ${oldName}${name && name !== oldName ? ` → ${name}` : ''}`,
      target: { type: 'faculty', id: faculty._id.toString(), name: faculty.name }
    });

    res.json(faculty);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Faculty with this name already exists in this campus' });
    }
    console.error('Error updating faculty:', error);
    res.status(500).json({ message: 'Error updating faculty', error: error.message });
  }
});

// DELETE faculty
router.delete('/faculties/:id', auth, async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // Check if faculty has associated programs
    const programCount = await Program.countDocuments({ faculty: faculty._id });
    if (programCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete faculty. It has ${programCount} programs associated with it.` 
      });
    }

    await Faculty.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      actor: req.user,
      action: 'faculty_deleted',
      description: `Deleted faculty: ${faculty.name}`,
      target: { type: 'faculty', id: faculty._id.toString(), name: faculty.name }
    });

    res.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    console.error('Error deleting faculty:', error);
    res.status(500).json({ message: 'Error deleting faculty', error: error.message });
  }
});

// ==================== OFFICES ====================

// GET all offices (public for signup, auth for admin)
router.get('/offices', async (req, res) => {
  try {
    const { campusId } = req.query;
    const query = campusId ? { campus: campusId } : {};
    const offices = await Office.find(query)
      .populate('campus', 'name')
      .sort({ order: 1, name: 1 });
    res.json(offices);
  } catch (error) {
    console.error('Error fetching offices:', error);
    res.status(500).json({ message: 'Error fetching offices', error: error.message });
  }
});

// GET single office
router.get('/offices/:id', auth, async (req, res) => {
  try {
    const office = await Office.findById(req.params.id).populate('campus', 'name');
    if (!office) {
      return res.status(404).json({ message: 'Office not found' });
    }
    res.json(office);
  } catch (error) {
    console.error('Error fetching office:', error);
    res.status(500).json({ message: 'Error fetching office', error: error.message });
  }
});

// POST create office
router.post('/offices', auth, async (req, res) => {
  try {
    const { name, campus, isActive, order } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Office name is required' });
    }
    if (!campus) {
      return res.status(400).json({ message: 'Campus is required' });
    }

    const office = new Office({
      name: name.trim(),
      campus,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    await office.save();
    await office.populate('campus', 'name');

    await logAuditEvent({
      actor: req.user,
      action: 'office_created',
      description: `Created office: ${office.name}`,
      target: { type: 'office', id: office._id.toString(), name: office.name }
    });

    res.status(201).json(office);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Office with this name already exists for this campus' });
    }
    console.error('Error creating office:', error);
    res.status(500).json({ message: 'Error creating office', error: error.message });
  }
});

// PUT update office
router.put('/offices/:id', auth, async (req, res) => {
  try {
    const { name, campus, isActive, order } = req.body;
    const office = await Office.findById(req.params.id);
    
    if (!office) {
      return res.status(404).json({ message: 'Office not found' });
    }

    const oldName = office.name;
    if (name) office.name = name.trim();
    if (campus) office.campus = campus;
    if (isActive !== undefined) office.isActive = isActive;
    if (order !== undefined) office.order = order;

    await office.save();
    await office.populate('campus', 'name');

    await logAuditEvent({
      actor: req.user,
      action: 'office_updated',
      description: `Updated office: ${oldName}${name && name !== oldName ? ` → ${name}` : ''}`,
      target: { type: 'office', id: office._id.toString(), name: office.name }
    });

    res.json(office);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Office with this name already exists for this campus' });
    }
    console.error('Error updating office:', error);
    res.status(500).json({ message: 'Error updating office', error: error.message });
  }
});

// DELETE office
router.delete('/offices/:id', auth, async (req, res) => {
  try {
    const office = await Office.findById(req.params.id);
    if (!office) {
      return res.status(404).json({ message: 'Office not found' });
    }

    // Check if office has associated units
    const unitCount = await Unit.countDocuments({ office: office._id });
    if (unitCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete office. It has ${unitCount} units associated with it.` 
      });
    }

    await Office.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      actor: req.user,
      action: 'office_deleted',
      description: `Deleted office: ${office.name}`,
      target: { type: 'office', id: office._id.toString(), name: office.name }
    });

    res.json({ message: 'Office deleted successfully' });
  } catch (error) {
    console.error('Error deleting office:', error);
    res.status(500).json({ message: 'Error deleting office', error: error.message });
  }
});

// ==================== UNITS ====================

// GET all units (public for signup, auth for admin)
router.get('/units', async (req, res) => {
  try {
    const { officeId } = req.query;
    const query = officeId ? { office: officeId } : {};
    const units = await Unit.find(query)
      .populate('office', 'name')
      .sort({ order: 1, name: 1 });
    res.json(units);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ message: 'Error fetching units', error: error.message });
  }
});

// POST create unit
router.post('/units', auth, async (req, res) => {
  try {
    const { name, office, isActive, order } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Unit name is required' });
    }
    if (!office) {
      return res.status(400).json({ message: 'Office is required' });
    }

    const unit = new Unit({
      name: name.trim(),
      office,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    await unit.save();
    await unit.populate('office', 'name');

    await logAuditEvent({
      actor: req.user,
      action: 'unit_created',
      description: `Created unit: ${unit.name}`,
      target: { type: 'unit', id: unit._id.toString(), name: unit.name }
    });

    res.status(201).json(unit);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Unit with this name already exists for this office' });
    }
    console.error('Error creating unit:', error);
    res.status(500).json({ message: 'Error creating unit', error: error.message });
  }
});

// PUT update unit
router.put('/units/:id', auth, async (req, res) => {
  try {
    const { name, office, isActive, order } = req.body;
    const unit = await Unit.findById(req.params.id);
    
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    const oldName = unit.name;
    if (name) unit.name = name.trim();
    if (office) unit.office = office;
    if (isActive !== undefined) unit.isActive = isActive;
    if (order !== undefined) unit.order = order;

    await unit.save();
    await unit.populate('office', 'name');

    await logAuditEvent({
      actor: req.user,
      action: 'unit_updated',
      description: `Updated unit: ${oldName}${name && name !== oldName ? ` → ${name}` : ''}`,
      target: { type: 'unit', id: unit._id.toString(), name: unit.name }
    });

    res.json(unit);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Unit with this name already exists for this office' });
    }
    console.error('Error updating unit:', error);
    res.status(500).json({ message: 'Error updating unit', error: error.message });
  }
});

// DELETE unit
router.delete('/units/:id', auth, async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    await Unit.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      actor: req.user,
      action: 'unit_deleted',
      description: `Deleted unit: ${unit.name}`,
      target: { type: 'unit', id: unit._id.toString(), name: unit.name }
    });

    res.json({ message: 'Unit deleted successfully' });
  } catch (error) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ message: 'Error deleting unit', error: error.message });
  }
});

// ==================== PROGRAMS ====================

// GET all programs (public for signup, auth for admin)
router.get('/programs', async (req, res) => {
  try {
    const { facultyId, campusId } = req.query;
    const query = {};
    if (facultyId) query.faculty = facultyId;
    if (campusId) query.campus = campusId;
    
    const programs = await Program.find(query)
      .populate('faculty', 'name')
      .populate('campus', 'name')
      .sort({ order: 1, name: 1 });
    res.json(programs);
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ message: 'Error fetching programs', error: error.message });
  }
});

// GET single program
router.get('/programs/:id', auth, async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
      .populate('faculty', 'name')
      .populate('campus', 'name');
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }
    res.json(program);
  } catch (error) {
    console.error('Error fetching program:', error);
    res.status(500).json({ message: 'Error fetching program', error: error.message });
  }
});

// POST create program
router.post('/programs', auth, async (req, res) => {
  try {
    const { name, faculty, campus, isActive, order } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Program name is required' });
    }
    if (!faculty) {
      return res.status(400).json({ message: 'Faculty is required' });
    }

    const program = new Program({
      name: name.trim(),
      faculty,
      campus: campus || null,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    await program.save();
    await program.populate('faculty', 'name');
    if (program.campus) {
      await program.populate('campus', 'name');
    }

    await logAuditEvent({
      actor: req.user,
      action: 'program_created',
      description: `Created program: ${program.name}`,
      target: { type: 'program', id: program._id.toString(), name: program.name }
    });

    res.status(201).json(program);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Program with this name already exists for this faculty' });
    }
    console.error('Error creating program:', error);
    res.status(500).json({ message: 'Error creating program', error: error.message });
  }
});

// PUT update program
router.put('/programs/:id', auth, async (req, res) => {
  try {
    const { name, faculty, campus, isActive, order } = req.body;
    const program = await Program.findById(req.params.id);
    
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    const oldName = program.name;
    if (name) program.name = name.trim();
    if (faculty) program.faculty = faculty;
    if (campus !== undefined) program.campus = campus || null;
    if (isActive !== undefined) program.isActive = isActive;
    if (order !== undefined) program.order = order;

    await program.save();
    await program.populate('faculty', 'name');
    if (program.campus) {
      await program.populate('campus', 'name');
    }

    await logAuditEvent({
      actor: req.user,
      action: 'program_updated',
      description: `Updated program: ${oldName}${name && name !== oldName ? ` → ${name}` : ''}`,
      target: { type: 'program', id: program._id.toString(), name: program.name }
    });

    res.json(program);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Program with this name already exists for this faculty' });
    }
    console.error('Error updating program:', error);
    res.status(500).json({ message: 'Error updating program', error: error.message });
  }
});

// DELETE program
router.delete('/programs/:id', auth, async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    await Program.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      actor: req.user,
      action: 'program_deleted',
      description: `Deleted program: ${program.name}`,
      target: { type: 'program', id: program._id.toString(), name: program.name }
    });

    res.json({ message: 'Program deleted successfully' });
  } catch (error) {
    console.error('Error deleting program:', error);
    res.status(500).json({ message: 'Error deleting program', error: error.message });
  }
});

// ==================== UNIVERSITY LEVEL OFFICES ====================

// GET all university level offices (public for signup, auth for admin)
router.get('/university-level-offices', async (req, res) => {
  try {
    const offices = await UniversityLevelOffice.find().sort({ order: 1, name: 1 });
    res.json(offices);
  } catch (error) {
    console.error('Error fetching university level offices:', error);
    res.status(500).json({ message: 'Error fetching university level offices', error: error.message });
  }
});

// GET single university level office
router.get('/university-level-offices/:id', auth, async (req, res) => {
  try {
    const office = await UniversityLevelOffice.findById(req.params.id);
    if (!office) {
      return res.status(404).json({ message: 'University level office not found' });
    }
    res.json(office);
  } catch (error) {
    console.error('Error fetching university level office:', error);
    res.status(500).json({ message: 'Error fetching university level office', error: error.message });
  }
});

// POST create university level office
router.post('/university-level-offices', auth, async (req, res) => {
  try {
    const { name, isActive, order } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Office name is required' });
    }

    const office = new UniversityLevelOffice({
      name: name.trim(),
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    await office.save();

    await logAuditEvent({
      actor: req.user,
      action: 'university_level_office_created',
      description: `Created university level office: ${office.name}`,
      target: { type: 'university_level_office', id: office._id.toString(), name: office.name }
    });

    res.status(201).json(office);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'University level office with this name already exists' });
    }
    console.error('Error creating university level office:', error);
    res.status(500).json({ message: 'Error creating university level office', error: error.message });
  }
});

// PUT update university level office
router.put('/university-level-offices/:id', auth, async (req, res) => {
  try {
    const { name, isActive, order } = req.body;
    const office = await UniversityLevelOffice.findById(req.params.id);
    
    if (!office) {
      return res.status(404).json({ message: 'University level office not found' });
    }

    const oldName = office.name;
    if (name) office.name = name.trim();
    if (isActive !== undefined) office.isActive = isActive;
    if (order !== undefined) office.order = order;

    await office.save();

    await logAuditEvent({
      actor: req.user,
      action: 'university_level_office_updated',
      description: `Updated university level office: ${oldName}${name && name !== oldName ? ` → ${name}` : ''}`,
      target: { type: 'university_level_office', id: office._id.toString(), name: office.name }
    });

    res.json(office);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'University level office with this name already exists' });
    }
    console.error('Error updating university level office:', error);
    res.status(500).json({ message: 'Error updating university level office', error: error.message });
  }
});

// DELETE university level office
router.delete('/university-level-offices/:id', auth, async (req, res) => {
  try {
    const office = await UniversityLevelOffice.findById(req.params.id);
    if (!office) {
      return res.status(404).json({ message: 'University level office not found' });
    }

    await UniversityLevelOffice.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      actor: req.user,
      action: 'university_level_office_deleted',
      description: `Deleted university level office: ${office.name}`,
      target: { type: 'university_level_office', id: office._id.toString(), name: office.name }
    });

    res.json({ message: 'University level office deleted successfully' });
  } catch (error) {
    console.error('Error deleting university level office:', error);
    res.status(500).json({ message: 'Error deleting university level office', error: error.message });
  }
});

// ==================== YEAR CYCLES ====================

// GET all year cycles (public for signup, auth for admin)
router.get('/year-cycles', async (req, res) => {
  try {
    const yearCycles = await YearCycle.find().sort({ order: 1, startYear: -1 });
    res.json(yearCycles);
  } catch (error) {
    console.error('Error fetching year cycles:', error);
    res.status(500).json({ message: 'Error fetching year cycles', error: error.message });
  }
});

// GET single year cycle
router.get('/year-cycles/:id', auth, async (req, res) => {
  try {
    const yearCycle = await YearCycle.findById(req.params.id);
    if (!yearCycle) {
      return res.status(404).json({ message: 'Year cycle not found' });
    }
    res.json(yearCycle);
  } catch (error) {
    console.error('Error fetching year cycle:', error);
    res.status(500).json({ message: 'Error fetching year cycle', error: error.message });
  }
});

// POST create year cycle
router.post('/year-cycles', auth, async (req, res) => {
  try {
    const { name, isActive, order } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Year cycle name is required' });
    }

    // Validate format
    if (!/^\d{4}-\d{4}$/.test(name.trim())) {
      return res.status(400).json({ message: 'Year cycle must be in format YYYY-YYYY (e.g., "2024-2026")' });
    }

    const parts = name.trim().split('-');
    const startYear = parseInt(parts[0], 10);
    const endYear = parseInt(parts[1], 10);

    if (isNaN(startYear) || isNaN(endYear)) {
      return res.status(400).json({ message: 'Invalid year values' });
    }

    if (endYear <= startYear) {
      return res.status(400).json({ message: 'End year must be greater than start year' });
    }

    const yearCycle = new YearCycle({
      name: name.trim(),
      startYear,
      endYear,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    await yearCycle.save();

    await logAuditEvent({
      actor: req.user,
      action: 'year_cycle_created',
      description: `Created year cycle: ${yearCycle.name}`,
      target: { type: 'year_cycle', id: yearCycle._id.toString(), name: yearCycle.name }
    });

    res.status(201).json(yearCycle);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Year cycle with this name already exists' });
    }
    console.error('Error creating year cycle:', error);
    res.status(500).json({ message: 'Error creating year cycle', error: error.message });
  }
});

// PUT update year cycle
router.put('/year-cycles/:id', auth, async (req, res) => {
  try {
    const { name, isActive, order } = req.body;
    const yearCycle = await YearCycle.findById(req.params.id);
    
    if (!yearCycle) {
      return res.status(404).json({ message: 'Year cycle not found' });
    }

    const oldName = yearCycle.name;
    
    if (name && name.trim() !== oldName) {
      // Validate format
      if (!/^\d{4}-\d{4}$/.test(name.trim())) {
        return res.status(400).json({ message: 'Year cycle must be in format YYYY-YYYY (e.g., "2024-2026")' });
      }

      const parts = name.trim().split('-');
      const startYear = parseInt(parts[0], 10);
      const endYear = parseInt(parts[1], 10);

      if (isNaN(startYear) || isNaN(endYear)) {
        return res.status(400).json({ message: 'Invalid year values' });
      }

      if (endYear <= startYear) {
        return res.status(400).json({ message: 'End year must be greater than start year' });
      }

      yearCycle.name = name.trim();
      yearCycle.startYear = startYear;
      yearCycle.endYear = endYear;
    }
    
    if (isActive !== undefined) yearCycle.isActive = isActive;
    if (order !== undefined) yearCycle.order = order;

    await yearCycle.save();

    await logAuditEvent({
      actor: req.user,
      action: 'year_cycle_updated',
      description: `Updated year cycle: ${oldName}${name && name !== oldName ? ` → ${name}` : ''}`,
      target: { type: 'year_cycle', id: yearCycle._id.toString(), name: yearCycle.name }
    });

    res.json(yearCycle);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Year cycle with this name already exists' });
    }
    console.error('Error updating year cycle:', error);
    res.status(500).json({ message: 'Error updating year cycle', error: error.message });
  }
});

// DELETE year cycle
router.delete('/year-cycles/:id', auth, async (req, res) => {
  try {
    const yearCycle = await YearCycle.findById(req.params.id);
    if (!yearCycle) {
      return res.status(404).json({ message: 'Year cycle not found' });
    }

    // Check if year cycle has associated requests
    const requestCount = await Request.countDocuments({ year: yearCycle.name });
    if (requestCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete year cycle. It has ${requestCount} request(s) associated with it.` 
      });
    }

    await YearCycle.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      actor: req.user,
      action: 'year_cycle_deleted',
      description: `Deleted year cycle: ${yearCycle.name}`,
      target: { type: 'year_cycle', id: yearCycle._id.toString(), name: yearCycle.name }
    });

    res.json({ message: 'Year cycle deleted successfully' });
  } catch (error) {
    console.error('Error deleting year cycle:', error);
    res.status(500).json({ message: 'Error deleting year cycle', error: error.message });
  }
});

module.exports = router;

