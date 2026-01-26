const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
const Campus = require('../models/Campus');
const Faculty = require('../models/Faculty');
const Office = require('../models/Office');
const Unit = require('../models/Unit');
const Program = require('../models/Program');
const UniversityLevelOffice = require('../models/UniversityLevelOffice');
const YearCycle = require('../models/YearCycle');

const seedOrganizationData = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('ERROR: MONGODB_URI environment variable is not set!');
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');
    console.log('Starting to seed organization data...\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing data...');
    await Campus.deleteMany({});
    await Faculty.deleteMany({});
    await Office.deleteMany({});
    await Unit.deleteMany({});
    await Program.deleteMany({});
    await UniversityLevelOffice.deleteMany({});
    // Note: Year cycles are NOT cleared to preserve existing data
    console.log('Existing data cleared.\n');

    // 1. Create Campuses
    console.log('Creating campuses...');
    const campuses = await Campus.insertMany([
      { name: 'Main', isMain: true, isActive: true, order: 1 },
      { name: 'Baganga', isMain: false, isActive: true, order: 2 },
      { name: 'Tarragona', isMain: false, isActive: true, order: 3 },
      { name: 'Banaybanay', isMain: false, isActive: true, order: 4 },
      { name: 'San Isidro', isMain: false, isActive: true, order: 5 }
    ]);
    console.log(`✓ Created ${campuses.length} campuses`);

    const mainCampus = campuses.find(c => c.name === 'Main');
    const bagangaCampus = campuses.find(c => c.name === 'Baganga');
    const tarragonaCampus = campuses.find(c => c.name === 'Tarragona');
    const banaybanayCampus = campuses.find(c => c.name === 'Banaybanay');
    const sanIsidroCampus = campuses.find(c => c.name === 'San Isidro');

    // 2. Create Faculties (all linked to Main campus)
    console.log('\nCreating faculties...');
    const faculties = await Faculty.insertMany([
      { name: 'Faculty of Advanced and International Studies', campus: mainCampus._id, isActive: true, order: 1 },
      { name: 'Faculty of Agriculture and Life Sciences', campus: mainCampus._id, isActive: true, order: 2 },
      { name: 'Faculty of Business and Management', campus: mainCampus._id, isActive: true, order: 3 },
      { name: 'Faculty of Computing, Engineering, and Technology', campus: mainCampus._id, isActive: true, order: 4 },
      { name: 'Faculty of Criminal Justice Education', campus: mainCampus._id, isActive: true, order: 5 },
      { name: 'Faculty of Humanities, Social Sciences, and Communication', campus: mainCampus._id, isActive: true, order: 6 },
      { name: 'Faculty of Nursing and Allied Health Sciences', campus: mainCampus._id, isActive: true, order: 7 },
      { name: 'Faculty of Teacher Education', campus: mainCampus._id, isActive: true, order: 8 }
    ]);
    console.log(`✓ Created ${faculties.length} faculties`);

    const facultyMap = {};
    faculties.forEach(f => {
      facultyMap[f.name] = f;
    });

    // 3. Create Programs
    console.log('\nCreating programs...');
    const programsData = [
      // Faculty of Advanced and International Studies
      { name: 'MAEd Ed. Mgmt.', faculty: facultyMap['Faculty of Advanced and International Studies']._id, campus: null, isActive: true, order: 1 },
      { name: 'MAEd-TE', faculty: facultyMap['Faculty of Advanced and International Studies']._id, campus: null, isActive: true, order: 2 },
      { name: 'MST-TM', faculty: facultyMap['Faculty of Advanced and International Studies']._id, campus: null, isActive: true, order: 3 },
      { name: 'MBA', faculty: facultyMap['Faculty of Advanced and International Studies']._id, campus: null, isActive: true, order: 4 },
      { name: 'MBEnvSc', faculty: facultyMap['Faculty of Advanced and International Studies']._id, campus: null, isActive: true, order: 5 },
      { name: 'PhD Biology-Biodiversity', faculty: facultyMap['Faculty of Advanced and International Studies']._id, campus: null, isActive: true, order: 6 },
      { name: 'EdD-ELM', faculty: facultyMap['Faculty of Advanced and International Studies']._id, campus: null, isActive: true, order: 7 },
      { name: 'PHd Env.Sci', faculty: facultyMap['Faculty of Advanced and International Studies']._id, campus: null, isActive: true, order: 8 },
      
      // Faculty of Agriculture and Life Sciences
      { name: 'BSAM', faculty: facultyMap['Faculty of Agriculture and Life Sciences']._id, campus: null, isActive: true, order: 1 },
      { name: 'BSA', faculty: facultyMap['Faculty of Agriculture and Life Sciences']._id, campus: null, isActive: true, order: 2 },
      { name: 'BSBio', faculty: facultyMap['Faculty of Agriculture and Life Sciences']._id, campus: null, isActive: true, order: 3 },
      { name: 'BSES', faculty: facultyMap['Faculty of Agriculture and Life Sciences']._id, campus: null, isActive: true, order: 4 },
      
      // Faculty of Business and Management
      { name: 'BSBA', faculty: facultyMap['Faculty of Business and Management']._id, campus: null, isActive: true, order: 1 },
      { name: 'BSHM', faculty: facultyMap['Faculty of Business and Management']._id, campus: null, isActive: true, order: 2 },
      
      // Faculty of Computing, Engineering, and Technology
      { name: 'BITM', faculty: facultyMap['Faculty of Computing, Engineering, and Technology']._id, campus: null, isActive: true, order: 1 },
      { name: 'BSCE', faculty: facultyMap['Faculty of Computing, Engineering, and Technology']._id, campus: null, isActive: true, order: 2 },
      { name: 'BSIT', faculty: facultyMap['Faculty of Computing, Engineering, and Technology']._id, campus: null, isActive: true, order: 3 },
      { name: 'BSMath', faculty: facultyMap['Faculty of Computing, Engineering, and Technology']._id, campus: null, isActive: true, order: 4 },
      
      // Faculty of Criminal Justice Education
      { name: 'BSC', faculty: facultyMap['Faculty of Criminal Justice Education']._id, campus: null, isActive: true, order: 1 },
      
      // Faculty of Humanities, Social Sciences, and Communication
      { name: 'BA PolSci', faculty: facultyMap['Faculty of Humanities, Social Sciences, and Communication']._id, campus: null, isActive: true, order: 1 },
      { name: 'BSDevCom', faculty: facultyMap['Faculty of Humanities, Social Sciences, and Communication']._id, campus: null, isActive: true, order: 2 },
      { name: 'BSPsychology', faculty: facultyMap['Faculty of Humanities, Social Sciences, and Communication']._id, campus: null, isActive: true, order: 3 },
      
      // Faculty of Nursing and Allied Health Sciences
      { name: 'BSN', faculty: facultyMap['Faculty of Nursing and Allied Health Sciences']._id, campus: null, isActive: true, order: 1 },
      
      // Faculty of Teacher Education
      { name: 'BEED', faculty: facultyMap['Faculty of Teacher Education']._id, campus: null, isActive: true, order: 1 },
      { name: 'BCED', faculty: facultyMap['Faculty of Teacher Education']._id, campus: null, isActive: true, order: 2 },
      { name: 'BSNED', faculty: facultyMap['Faculty of Teacher Education']._id, campus: null, isActive: true, order: 3 },
      { name: 'BPED', faculty: facultyMap['Faculty of Teacher Education']._id, campus: null, isActive: true, order: 4 },
      { name: 'BTLED', faculty: facultyMap['Faculty of Teacher Education']._id, campus: null, isActive: true, order: 5 },
      { name: 'BSED English', faculty: facultyMap['Faculty of Teacher Education']._id, campus: null, isActive: true, order: 6 },
      { name: 'BSED Filipino', faculty: facultyMap['Faculty of Teacher Education']._id, campus: null, isActive: true, order: 7 },
      { name: 'BSED Mathematics', faculty: facultyMap['Faculty of Teacher Education']._id, campus: null, isActive: true, order: 8 },
      { name: 'BSED Science', faculty: facultyMap['Faculty of Teacher Education']._id, campus: null, isActive: true, order: 9 },
      
      // Extension Campus Programs - Baganga
      { name: 'BSMath', faculty: facultyMap['Faculty of Computing, Engineering, and Technology']._id, campus: bagangaCampus._id, isActive: true, order: 1 },
      { name: 'BSIT', faculty: facultyMap['Faculty of Computing, Engineering, and Technology']._id, campus: bagangaCampus._id, isActive: true, order: 2 },
      { name: 'BSAM', faculty: facultyMap['Faculty of Agriculture and Life Sciences']._id, campus: bagangaCampus._id, isActive: true, order: 3 },
      { name: 'BSHM', faculty: facultyMap['Faculty of Business and Management']._id, campus: bagangaCampus._id, isActive: true, order: 4 },
      { name: 'BSES', faculty: facultyMap['Faculty of Agriculture and Life Sciences']._id, campus: bagangaCampus._id, isActive: true, order: 5 },
      { name: 'BSA', faculty: facultyMap['Faculty of Agriculture and Life Sciences']._id, campus: bagangaCampus._id, isActive: true, order: 6 },
      { name: 'BEED', faculty: facultyMap['Faculty of Teacher Education']._id, campus: bagangaCampus._id, isActive: true, order: 7 },
      
      // Extension Campus Programs - Tarragona
      { name: 'BSMath', faculty: facultyMap['Faculty of Computing, Engineering, and Technology']._id, campus: tarragonaCampus._id, isActive: true, order: 1 },
      { name: 'BSIT', faculty: facultyMap['Faculty of Computing, Engineering, and Technology']._id, campus: tarragonaCampus._id, isActive: true, order: 2 },
      { name: 'BSAM', faculty: facultyMap['Faculty of Agriculture and Life Sciences']._id, campus: tarragonaCampus._id, isActive: true, order: 3 },
      { name: 'BSHM', faculty: facultyMap['Faculty of Business and Management']._id, campus: tarragonaCampus._id, isActive: true, order: 4 },
      { name: 'BSES', faculty: facultyMap['Faculty of Agriculture and Life Sciences']._id, campus: tarragonaCampus._id, isActive: true, order: 5 },
      { name: 'BSA', faculty: facultyMap['Faculty of Agriculture and Life Sciences']._id, campus: tarragonaCampus._id, isActive: true, order: 6 },
      { name: 'BEED', faculty: facultyMap['Faculty of Teacher Education']._id, campus: tarragonaCampus._id, isActive: true, order: 7 },
      
      // Extension Campus Programs - Banaybanay
      { name: 'BAT', faculty: facultyMap['Faculty of Agriculture and Life Sciences']._id, campus: banaybanayCampus._id, isActive: true, order: 1 },
      { name: 'BSIT', faculty: facultyMap['Faculty of Computing, Engineering, and Technology']._id, campus: banaybanayCampus._id, isActive: true, order: 2 },
      { name: 'BTLED', faculty: facultyMap['Faculty of Teacher Education']._id, campus: banaybanayCampus._id, isActive: true, order: 3 },
      { name: 'BSA', faculty: facultyMap['Faculty of Agriculture and Life Sciences']._id, campus: banaybanayCampus._id, isActive: true, order: 4 },
      { name: 'BSBA', faculty: facultyMap['Faculty of Business and Management']._id, campus: banaybanayCampus._id, isActive: true, order: 5 },
      
      // Extension Campus Programs - San Isidro
      { name: 'BEED', faculty: facultyMap['Faculty of Teacher Education']._id, campus: sanIsidroCampus._id, isActive: true, order: 1 },
      { name: 'BSCrim', faculty: facultyMap['Faculty of Criminal Justice Education']._id, campus: sanIsidroCampus._id, isActive: true, order: 2 },
      { name: 'BSBA', faculty: facultyMap['Faculty of Business and Management']._id, campus: sanIsidroCampus._id, isActive: true, order: 3 },
      { name: 'BSA', faculty: facultyMap['Faculty of Agriculture and Life Sciences']._id, campus: sanIsidroCampus._id, isActive: true, order: 4 }
    ];

    const programs = await Program.insertMany(programsData);
    console.log(`✓ Created ${programs.length} programs`);

    // 4. Create Offices for Main Campus
    console.log('\nCreating offices...');
    const offices = await Office.insertMany([
      { name: 'External and Special Units', campus: mainCampus._id, isActive: true, order: 1 },
      { name: 'Faculties', campus: mainCampus._id, isActive: true, order: 2 },
      { name: 'Directorates', campus: mainCampus._id, isActive: true, order: 3 },
      { name: 'Student Affairs and Services Offices', campus: mainCampus._id, isActive: true, order: 4 },
      { name: 'University Registrar Offices', campus: mainCampus._id, isActive: true, order: 5 },
      { name: 'National Service Training Program Offices', campus: mainCampus._id, isActive: true, order: 6 },
      { name: 'University Library Services Offices', campus: mainCampus._id, isActive: true, order: 7 }
    ]);
    console.log(`✓ Created ${offices.length} offices`);

    const officeMap = {};
    offices.forEach(o => {
      officeMap[o.name] = o;
    });

    // 5. Create Units
    console.log('\nCreating units...');
    const unitsData = [
      // External and Special Units
      { name: 'External Studies Units', office: officeMap['External and Special Units']._id, isActive: true, order: 1 },
      { name: 'Laboratory Management Office', office: officeMap['External and Special Units']._id, isActive: true, order: 2 },
      
      // Faculties (these are the faculty names themselves)
      { name: 'Faculty of Advanced and International Studies', office: officeMap['Faculties']._id, isActive: true, order: 1 },
      { name: 'Faculty of Agriculture and Life Sciences', office: officeMap['Faculties']._id, isActive: true, order: 2 },
      { name: 'Faculty of Business and Management', office: officeMap['Faculties']._id, isActive: true, order: 3 },
      { name: 'Faculty of Computing, Engineering, and Technology', office: officeMap['Faculties']._id, isActive: true, order: 4 },
      { name: 'Faculty of Criminal Justice Education', office: officeMap['Faculties']._id, isActive: true, order: 5 },
      { name: 'Faculty of Humanities, Social Sciences, and Communication', office: officeMap['Faculties']._id, isActive: true, order: 6 },
      { name: 'Faculty of Nursing and Allied Health Sciences', office: officeMap['Faculties']._id, isActive: true, order: 7 },
      { name: 'Faculty of Teacher Education', office: officeMap['Faculties']._id, isActive: true, order: 8 },
      
      // Directorates
      { name: 'Directorate for Student Affairs and Services', office: officeMap['Directorates']._id, isActive: true, order: 1 },
      { name: 'Directorate for University Registrar', office: officeMap['Directorates']._id, isActive: true, order: 2 },
      { name: 'Directorate for National Service Training Program', office: officeMap['Directorates']._id, isActive: true, order: 3 },
      { name: 'Directorate for University Library Services', office: officeMap['Directorates']._id, isActive: true, order: 4 },
      
      // Student Affairs and Services Offices
      { name: 'Office of Student Counseling and Development', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 1 },
      { name: 'Office of Student Employment and Placement Services', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 2 },
      { name: 'Office of Financial Aids and Scholarship Grants', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 3 },
      { name: 'Office of Student Housing and Services', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 4 },
      { name: 'Office of Student Internship Program', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 5 },
      { name: 'Office of Student Sports and Wellness', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 6 },
      { name: 'Office of Student Affairs', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 7 },
      { name: 'Office of Student Promotion, Admissions, and Testing', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 8 },
      { name: 'Office of Health Services', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 9 },
      { name: 'Office of Student Culture and Arts Literacy', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 10 },
      { name: 'Office of Student Volunteerism and Community Engagement', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 11 },
      { name: 'Student Organization Unit', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 12 },
      { name: 'Student Discipline Unit', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 13 },
      { name: 'Student Publication Unit', office: officeMap['Student Affairs and Services Offices']._id, isActive: true, order: 14 },
      
      // University Registrar Offices
      { name: 'Office of Student Records Management', office: officeMap['University Registrar Offices']._id, isActive: true, order: 1 },
      { name: 'Office of Student Records Archiving', office: officeMap['University Registrar Offices']._id, isActive: true, order: 2 },
      { name: 'Office of Student Records Production, Maintenance, and Digitalization', office: officeMap['University Registrar Offices']._id, isActive: true, order: 3 },
      
      // National Service Training Program Offices
      { name: 'Office of Literacy Training Services', office: officeMap['National Service Training Program Offices']._id, isActive: true, order: 1 },
      { name: 'Office of Civil Welfare and Training Services', office: officeMap['National Service Training Program Offices']._id, isActive: true, order: 2 },
      { name: 'Office of Reserve Officer Training Corps', office: officeMap['National Service Training Program Offices']._id, isActive: true, order: 3 },
      { name: 'Office of National Service Reserved Corps', office: officeMap['National Service Training Program Offices']._id, isActive: true, order: 4 },
      
      // University Library Services Offices
      { name: 'Library for Advanced and International Studies', office: officeMap['University Library Services Offices']._id, isActive: true, order: 1 },
      { name: 'Office of Administrative Services', office: officeMap['University Library Services Offices']._id, isActive: true, order: 2 },
      { name: 'Office of Technical Services', office: officeMap['University Library Services Offices']._id, isActive: true, order: 3 },
      { name: 'Office Central Systems and Network Services', office: officeMap['University Library Services Offices']._id, isActive: true, order: 4 },
      { name: 'Office Client Education and Information Services', office: officeMap['University Library Services Offices']._id, isActive: true, order: 5 },
      { name: 'Library for San Isidro Campus', office: officeMap['University Library Services Offices']._id, isActive: true, order: 6 }
    ];

    const units = await Unit.insertMany(unitsData);
    console.log(`✓ Created ${units.length} units`);

    // 6. Create University-Level Offices
    console.log('\nCreating university-level offices...');
    const universityLevelOffices = await UniversityLevelOffice.insertMany([
      { name: 'Office of the University President', isActive: true, order: 1 },
      { name: 'Office of the Vice President for Academic Affairs', isActive: true, order: 2 },
      { name: 'Office of the Chancellor', isActive: true, order: 3 }
    ]);
    console.log(`✓ Created ${universityLevelOffices.length} university-level offices`);

    // 7. Create Year Cycles (only if they don't exist)
    console.log('\nCreating year cycles...');
    const defaultYearCycles = [
      { name: '2024-2026', startYear: 2024, endYear: 2026, isActive: true, order: 1 },
      { name: '2027-2029', startYear: 2027, endYear: 2029, isActive: true, order: 2 },
      { name: '2030-2032', startYear: 2030, endYear: 2032, isActive: true, order: 3 },
      { name: '2033-2035', startYear: 2033, endYear: 2035, isActive: true, order: 4 }
    ];

    const existingYearCycles = await YearCycle.find({});
    const existingNames = existingYearCycles.map(yc => yc.name);
    const newYearCycles = defaultYearCycles.filter(yc => !existingNames.includes(yc.name));

    if (newYearCycles.length > 0) {
      const yearCycles = await YearCycle.insertMany(newYearCycles);
      console.log(`✓ Created ${yearCycles.length} new year cycles`);
    } else {
      console.log('✓ All default year cycles already exist');
    }

    console.log('\n✅ Organization data seeding completed successfully!');
    console.log('\nSummary:');
    console.log(`- Campuses: ${campuses.length}`);
    console.log(`- Faculties: ${faculties.length}`);
    console.log(`- Programs: ${programs.length}`);
    console.log(`- Offices: ${offices.length}`);
    console.log(`- Units: ${units.length}`);
    console.log(`- University-Level Offices: ${universityLevelOffices.length}`);
    console.log(`- Year Cycles: ${(await YearCycle.find()).length} total`);

    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding organization data:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed script
seedOrganizationData();

