const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ISSP = require('../models/ISSP');
const Request = require('../models/Request');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { logAuditEvent } = require('../utils/auditLogger');

const SECTION_LABELS = {
  organizationalProfile: 'Organizational Profile',
  informationSystemsStrategy: 'Information Systems Strategy',
  detailedIctProjects: 'Detailed ICT Projects',
  resourceRequirements: 'Resource Requirements',
  developmentInvestmentProgram: 'Development & Investment Program'
};

const formatLabel = (text = '') =>
  text
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());

// Helper function to get ISSP by unit for Program Heads (department accounts)
// For Program Heads, returns ISSP for their unit (shared department account)
// For other roles (admin, president), returns ISSP for their userId
// Also allows pending users to access unit data if their unit matches an existing Program Head's unit
const getISSPForUser = async (user) => {
  // Check if user is a Program Head (role is a unit name, not 'admin', 'president', or 'Program head')
  // OR if user is pending but has a unit that matches an existing Program Head's unit
  const isProgramHead = user.role && 
                        user.role !== 'admin' && 
                        user.role !== 'president' && 
                        user.role !== 'Executive' &&
                        user.unit && 
                        user.unit.trim() !== '';
  
  // Check if user is pending but has a unit - allow access if unit matches existing Program Head
  const isPendingWithUnit = user.approvalStatus === 'pending' && 
                            user.unit && 
                            user.unit.trim() !== '';
  
  if (isProgramHead || isPendingWithUnit) {
    // For Program Heads (and pending users with matching unit): Query by unit to get department's ISSP
    // This allows new Program Heads to see previous Program Head's data
    // AND allows pending users to preview the unit's data before approval
    
    // First try to find ISSP by unit
    let issp = await ISSP.findOne({ unit: user.unit });
    
    // If not found by unit, try to find ISSP by userId from users in the same unit (for backward compatibility)
    if (!issp) {
      const unitUsers = await User.find({ unit: user.unit }).select('_id');
      const unitUserIds = unitUsers.map(u => u._id);
      issp = await ISSP.findOne({ userId: { $in: unitUserIds } });
      
      // If found by userId, update it to have the unit field
      if (issp && (!issp.unit || issp.unit.trim() === '')) {
        issp.unit = user.unit;
        await issp.save();
      }
    }
    
    // If no ISSP exists for this unit, create one
    if (!issp) {
      issp = new ISSP({ 
        userId: user._id,
        unit: user.unit 
      });
      await issp.save();
    }
    
    return issp;
  } else {
    // For admin/president: Query by userId (individual account)
    let issp = await ISSP.findOne({ userId: user._id });
    
    if (!issp) {
      issp = new ISSP({ userId: user._id });
      await issp.save();
    }
    
    return issp;
  }
};

const getSectionLabel = (sectionKey = '') =>
  SECTION_LABELS[sectionKey] || formatLabel(sectionKey);

const getPageLabel = (pageKey = '') => formatLabel(pageKey);

const deepClone = (value = {}) => JSON.parse(JSON.stringify(value || {}));

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

const analyzeSectionChanges = (previousValue, currentValue, patchValue) => {
  if (patchValue === undefined) {
    return { changedFields: [], removedFields: [] };
  }

  // Handle array replacements
  if (Array.isArray(patchValue)) {
    const prevString = JSON.stringify(previousValue || []);
    const currString = JSON.stringify(currentValue || []);
    if (prevString === currString) {
      return { changedFields: [], removedFields: [] };
    }
    const removedFields =
      Array.isArray(previousValue) && previousValue.length && (!currentValue || !currentValue.length)
        ? ['entries']
        : [];
    return { changedFields: ['entries'], removedFields };
  }

  const changedFields = [];
  const removedFields = [];
  Object.keys(patchValue || {}).forEach((field) => {
    const previousFieldValue = previousValue ? previousValue[field] : undefined;
    const currentFieldValue = currentValue ? currentValue[field] : undefined;
    if (JSON.stringify(previousFieldValue) !== JSON.stringify(currentFieldValue)) {
      changedFields.push(field);
      if (!isEmptyValue(previousFieldValue) && isEmptyValue(currentFieldValue)) {
        removedFields.push(field);
      }
    }
  });
  return { changedFields, removedFields };
};

const logIsspSectionActivity = async ({
  req,
  isspId,
  sectionKey,
  pageKey,
  previousValue,
  currentValue,
  patchValue
}) => {
  const { changedFields, removedFields } = analyzeSectionChanges(previousValue, currentValue, patchValue);
  if (!changedFields.length) {
    return;
  }

  const sectionLabel = getSectionLabel(sectionKey);
  const pageLabel = getPageLabel(pageKey);
  const metadata = {
    section: sectionKey,
    page: pageKey,
    changedFields,
    removedFields
  };

  await logAuditEvent({
    actor: req.user,
    action: 'issp_section_updated',
    description: `Updated ${sectionLabel} (${pageLabel})`,
    target: { type: 'issp', id: isspId, name: req.user.id },
    metadata
  });

  if (removedFields.length) {
    await logAuditEvent({
      actor: req.user,
      action: 'issp_field_removed',
      description: `Removed data from ${sectionLabel} (${pageLabel})`,
      target: { type: 'issp', id: isspId, name: req.user.id },
      metadata
    });
  }
};

const hasNonEmptyString = (value) =>
  typeof value === 'string' && value.trim() !== '';

const hasAllStrings = (obj, fields) =>
  fields.every((field) => hasNonEmptyString(obj?.[field]));

const hasAnyRowData = (rows) =>
  Array.isArray(rows) && rows.some((row) =>
    row && Object.values(row).some((value) =>
      (typeof value === 'string' && value.trim() !== '') || (typeof value === 'number' && !Number.isNaN(value))
    )
  );

const parseStrategicConcerns = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') {
    // Legacy format: single object, convert to array
    if (raw.majorFinalOutput || raw.criticalSystems || raw.problems || raw.intendedUse) {
      return [{
        majorFinalOutput: raw.majorFinalOutput || '',
        criticalSystems: raw.criticalSystems || '',
        problems: raw.problems || '',
        intendedUse: raw.intendedUse || ''
      }];
    }
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    // Legacy single object format
    if (parsed.majorFinalOutput || parsed.criticalSystems || parsed.problems || parsed.intendedUse) {
      return [{
        majorFinalOutput: parsed.majorFinalOutput || '',
        criticalSystems: parsed.criticalSystems || '',
        problems: parsed.problems || '',
        intendedUse: parsed.intendedUse || ''
      }];
    }
    return [];
  } catch (error) {
    return [];
  }
};

const getContentWidth = (doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right;

const ensureSpace = (doc, heightNeeded) => {
  if (doc.y + heightNeeded > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    drawHeader(doc);
    doc.moveDown(0.8);
  }
};

const dataUrlToBuffer = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return null;
  }
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    return null;
  }
  const mime = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  return { mime, buffer };
};

const sanitizeRows = (rows) =>
  Array.isArray(rows)
    ? rows.filter((row) =>
        row && Object.values(row).some((value) =>
          (typeof value === 'string' && value.trim() !== '') || (typeof value === 'number' && !Number.isNaN(value))
        )
      )
    : [];

const addSectionHeader = (doc, text) => {
  doc.moveDown().font('Helvetica-Bold').fontSize(16).text(text, { underline: true });
  doc.moveDown(0.5);
};

const addSubHeader = (doc, text) => {
  doc.moveDown(0.5).font('Helvetica-Bold').fontSize(14).text(text);
  doc.moveDown(0.25);
};

const formatValue = (value) => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'string' && value.trim() === '') return 'N/A';
  return Array.isArray(value) ? value.join(', ') : String(value);
};

const addKeyValue = (doc, label, value) => {
  doc.font('Helvetica-Bold').fontSize(11).text(`${label}:`, { continued: true });
  doc.font('Helvetica').text(` ${formatValue(value)}`);
};

const addKeyValueList = (doc, entries = []) => {
  entries.forEach(([label, value]) => addKeyValue(doc, label, value));
  doc.moveDown(0.6);
};

const addBulletItem = (doc, label, value, options = {}) => {
  const {
    bulletChar = '\u2022',
    indent = 18,
    bodyIndentOffset = 14,
    labelFont = 'Helvetica-Bold',
    bodyFont = 'Helvetica-Oblique',
    after = 0.45
  } = options;

  const formatted = formatValue(value);
  const hasValue = formatted !== 'N/A';
  const bulletX = doc.page.margins.left + indent;
  const width = getContentWidth(doc) - indent;
  ensureSpace(doc, hasValue ? 34 : 18);

  doc.font(labelFont).fontSize(11).text(`${bulletChar} ${label}`, bulletX, doc.y, {
    width
  });

  if (hasValue) {
    doc.moveDown(0.15);
    const bodyX = bulletX + bodyIndentOffset;
    doc.font(bodyFont).fontSize(11).text(formatted, bodyX, doc.y, {
      width: width - bodyIndentOffset,
      align: 'justify'
    });
    doc.moveDown(0.25);
  } else {
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(11).text('No data provided.', bulletX + bodyIndentOffset, doc.y, {
      width: width - bodyIndentOffset
    });
    doc.moveDown(0.1);
  }

  doc.font('Helvetica');
  doc.moveDown(after);
};

const addItalicParagraph = (doc, value, indent = 12) => {
  const formatted = formatValue(value);
  doc.font('Helvetica-Oblique').fontSize(11).text(
    formatted === 'N/A' ? 'No data provided.' : formatted,
    {
      indent,
      align: 'justify'
    }
  );
  doc.font('Helvetica');
  doc.moveDown(0.6);
};

const addTableRows = (doc, rows, formatter) => {
  rows.forEach((row, index) => {
    formatter(row, index, doc);
    doc.moveDown(0.25);
  });
};

const formatKeyLabel = (key = '') =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const renderDataUrlImage = (doc, dataUrl, options = {}) => {
  const imageData = dataUrlToBuffer(dataUrl);
  if (imageData && imageData.mime && imageData.mime.startsWith('image/')) {
    const contentWidth = getContentWidth(doc);
    const maxWidth = Math.min(options.maxWidth || contentWidth, contentWidth);
    const maxHeight = options.maxHeight || 220;
    ensureSpace(doc, maxHeight + 20);
    doc.image(imageData.buffer, doc.page.margins.left, doc.y, {
      fit: [maxWidth, maxHeight]
    });
    doc.moveDown(0.5);
    return true;
  }
  return false;
};

const drawHeader = (doc, { isFirstPage = false, yearCycle = '2024-2027' } = {}) => {
  const contentWidth = getContentWidth(doc);
  const marginLeft = doc.page.margins.left;
  const titleFontSize = isFirstPage ? 18 : 16;
  doc.font('Helvetica-Bold').fontSize(titleFontSize).text('INFORMATION SYSTEMS STRATEGIC PLAN', marginLeft, doc.y, {
    align: 'center',
    width: contentWidth
  });
  doc.font('Helvetica').fontSize(12).text(yearCycle, {
    align: 'center',
    width: contentWidth
  });
  doc.moveDown(0.2);
  const lineY = doc.y;
  doc.moveTo(marginLeft, lineY).lineTo(marginLeft + contentWidth, lineY).stroke();
  doc.y = lineY + 10;
};

const drawPartHeading = (doc, text) => {
  ensureSpace(doc, 28);
  const contentWidth = getContentWidth(doc);
  const marginLeft = doc.page.margins.left;
  const height = 20;
  const y = doc.y;
  doc.save();
  doc.rect(marginLeft, y, contentWidth, height).fill('#d9d9d9');
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(12).text(text, marginLeft + 6, y + 5, {
    width: contentWidth - 12
  });
  doc.restore();
  doc.y = y + height + 14;
};

const drawSectionTitle = (doc, text, options = {}) => {
  const spacingBefore = options.before || 18;
  const spacingAfter = options.after !== undefined ? options.after : 0.5;
  ensureSpace(doc, spacingBefore);
  const marginLeft = doc.page.margins.left;
  const contentWidth = getContentWidth(doc);
  doc.x = marginLeft;
  doc.font('Helvetica-Bold').fontSize(12).text(text, marginLeft, doc.y, { width: contentWidth });
  doc.moveDown(spacingAfter);
};

const drawSubsectionTitle = (doc, text, options = {}) => {
  const indent = options.indent || 0;
  ensureSpace(doc, 16);
  const x = doc.page.margins.left + indent;
  const width = getContentWidth(doc) - indent;
  doc.font('Helvetica-Bold').fontSize(11).text(text, x, doc.y, { width });
  doc.moveDown(options.after || 0.2);
};

const addParagraph = (doc, text) => {
  const value = formatValue(text);
  ensureSpace(doc, 16);
  doc.font('Helvetica').fontSize(11).text(value === 'N/A' ? 'No data provided.' : value, {
    align: 'justify'
  });
  doc.moveDown(0.3);
};

const addBulletLine = (doc, label, value) => {
  const display = formatValue(value);
  ensureSpace(doc, 14);
  doc.font('Helvetica').fontSize(11).text(`• ${label}: ${display === 'N/A' ? 'No data provided.' : display}`, {
    indent: 15
  });
};

const addSimpleBulletList = (doc, items = [], options = {}) => {
  const indent = options.indent || 20;
  const bulletChar = options.bulletChar || '\u2022';
  const x = doc.page.margins.left + indent;
  const width = getContentWidth(doc) - indent;
  items.forEach((item) => {
    ensureSpace(doc, 14);
    doc
      .font('Helvetica')
      .fontSize(11)
      .text(`${bulletChar} ${item}`, x, doc.y, {
        width
      });
  });
  doc.moveDown(0.4);
};

const addIndentedKeyValueList = (doc, entries = [], options = {}) => {
  const indent = options.indent || 46;
  const bulletChar = options.bulletChar || '\u2022';
  const labelFont = options.labelFont || 'Helvetica-Bold';
  const valueFont = options.valueFont || 'Helvetica';
  const width = getContentWidth(doc) - indent;
  const x = doc.page.margins.left + indent;

  entries.forEach(([label, value]) => {
    ensureSpace(doc, 16);
    const display = formatValue(value);
    doc.font(labelFont).fontSize(11).text(`${bulletChar} ${label}:`, x, doc.y, {
      width,
      continued: true
    });
    doc
      .font(valueFont)
      .fontSize(11)
      .text(` ${display === 'N/A' ? 'No data provided.' : display}`, {
        width
      });
    doc.moveDown(options.lineGap || 0.3);
  });
  doc.moveDown(options.after || 0.6);
};

const drawTableB1 = (doc, rows = []) => {
  const sanitizedRows = sanitizeRows(rows).map((row) => ({
    ...row,
    plannerContact:
      row?.plannerContact ??
      row?.contactNumber ??
      row?.contactNumbers ??
      row?.plannerContactNumber ??
      ''
  }));

  const minRows = 10;
  const totalRows = Math.max(sanitizedRows.length, minRows);
  const marginLeft = doc.page.margins.left;
  const contentWidth = getContentWidth(doc);
  const columnRatios = [0.18, 0.16, 0.09, 0.09, 0.09, 0.09, 0.15, 0.15];
  const columnWidths = [];
  let accumulated = 0;
  columnRatios.forEach((ratio, index) => {
    if (index === columnRatios.length - 1) {
      columnWidths.push(contentWidth - accumulated);
    } else {
      const width = Math.round(contentWidth * ratio);
      columnWidths.push(width);
      accumulated += width;
    }
  });

  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const headerRow1Height = 32;
  const headerRow2Height = 22;
  const dataRowHeight = 24;
  const tableHeight = headerRow1Height + headerRow2Height + totalRows * dataRowHeight;

  ensureSpace(doc, tableHeight + 16);

  const startX = marginLeft;
  const startY = doc.y;
  const tableBottomY = startY + tableHeight;

  doc.save();
  doc.rect(startX, startY, totalWidth, headerRow1Height).fill('#ffffff');
  doc.restore();
  doc.save();
  doc.rect(startX, startY + headerRow1Height, totalWidth, headerRow2Height).fill('#ffffff');
  doc.restore();

  const columnPositions = [startX];
  columnWidths.reduce((current, width) => {
    const next = current + width;
    columnPositions.push(next);
    return next;
  }, startX);

  doc.lineWidth(0.7);

  // Vertical lines across entire table
  columnPositions.forEach((x) => {
    doc.moveTo(x, startY).lineTo(x, tableBottomY).stroke();
  });

  // Horizontal lines
  let currentY = startY;
  doc.moveTo(startX, currentY).lineTo(startX + totalWidth, currentY).stroke();
  currentY += headerRow1Height;
  const separatorStart = columnPositions[2];
  const separatorEnd = columnPositions[6];
  doc.moveTo(separatorStart, currentY).lineTo(separatorEnd, currentY).stroke();
  currentY += headerRow2Height;
  doc.moveTo(startX, currentY).lineTo(startX + totalWidth, currentY).stroke();

  for (let rowIndex = 0; rowIndex <= totalRows; rowIndex += 1) {
    const rowY = currentY + rowIndex * dataRowHeight;
    doc.moveTo(startX, rowY).lineTo(startX + totalWidth, rowY).stroke();
  }

  // Header text
  const renderHeaderCell = (text, startIndex, span, rowSpan = 1, fontSize = 10) => {
    const cellX = columnPositions[startIndex];
    const cellWidth = columnWidths.slice(startIndex, startIndex + span).reduce((sum, width) => sum + width, 0);
    const cellHeight = rowSpan === 2 ? headerRow1Height + headerRow2Height : headerRow1Height;
    const offsetY = rowSpan === 2 ? (headerRow1Height + headerRow2Height) / 2 : headerRow1Height / 2;
    doc.font('Helvetica-Bold')
      .fontSize(fontSize)
      .text(text, cellX + 4, startY + offsetY - (fontSize + (rowSpan === 2 ? 6 : 2)) / 2, {
        width: cellWidth - 8,
        align: 'center',
        lineGap: 1.2
      });
  };

  renderHeaderCell('ORGANIZATIONAL\nUNIT', 0, 1, 2, 10);
  renderHeaderCell('NAME OF\nAGENCY HEAD', 1, 1, 2, 10);
  renderHeaderCell('DESIGNATED\nIS PLANNER', 2, 4, 1, 9.5);
  renderHeaderCell('NUMBER OF\nEMPLOYEES', 6, 1, 2, 9.5);
  renderHeaderCell('CURRENT ANNUAL\nICT BUDGET', 7, 1, 2, 9.5);

  const subHeaders = [
    { text: 'NAME', index: 2 },
    { text: 'PLANTILLA POSITION', index: 3 },
    { text: 'E-MAIL ADDRESS', index: 4 },
    { text: 'CONTACT NUMBER', index: 5 }
  ];

  subHeaders.forEach((cell) => {
    const subX = columnPositions[cell.index];
    const subWidth = columnWidths[cell.index];
    doc.font('Helvetica-Bold')
      .fontSize(10)
      .text(cell.text, subX + 4, startY + headerRow1Height + headerRow2Height / 2 - 9, {
        width: subWidth - 8,
        align: 'center'
      });
  });

  // Row data
  const dataStartY = startY + headerRow1Height + headerRow2Height;
  const columnKeys = [
    'organizationalUnit',
    'agencyHead',
    'plannerName',
    'plannerPosition',
    'plannerEmail',
    'plannerContact',
    'employees',
    'ictBudget'
  ];

  for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
    const row = sanitizedRows[rowIndex] || {};
    const rowY = dataStartY + rowIndex * dataRowHeight + 8;

    columnKeys.forEach((key, columnIndex) => {
      const cellX = columnPositions[columnIndex];
      const cellWidth = columnWidths[columnIndex];
      const value = formatValue(row[key]);
      const display =
        value === 'N/A' ? '' : value;
      const align = columnIndex >= 6 ? 'center' : 'left';
    doc.font('Helvetica')
      .fontSize(9)
        .text(display, cellX + 4, rowY, {
          width: cellWidth - 8,
          align,
          lineGap: 1,
        height: dataRowHeight - 6
        });
    });
  }

  doc.y = tableBottomY + 12;
};

const drawTable = (doc, columns, rows, options = {}) => {
  const sanitizedRows = sanitizeRows(rows);
  if (!sanitizedRows.length) {
    doc.font('Helvetica').fontSize(11).text('No data provided.');
    doc.moveDown();
    return;
  }

  const contentWidth = getContentWidth(doc);
  const marginLeft = doc.page.margins.left;
  const rowHeight = options.rowHeight || 24;
  const headerBgColor = options.headerBgColor || '#d9d9d9';
  
  // Calculate column widths with proper distribution
  const columnWidths = [];
  let accumulated = 0;
  columns.forEach((col, index) => {
    if (index === columns.length - 1) {
      // Last column gets remaining width to ensure no gaps
      columnWidths.push(contentWidth - accumulated);
    } else {
      const width = Math.round(contentWidth * (col.widthRatio || (1 / columns.length)));
      columnWidths.push(width);
      accumulated += width;
    }
  });
  
  const totalWidth = contentWidth;
  
  // Calculate column positions
  const columnPositions = [marginLeft];
  columnWidths.reduce((current, width) => {
    const next = current + width;
    columnPositions.push(next);
    return next;
  }, marginLeft);

  // Function to draw table header
  const drawTableHeader = () => {
    const startY = doc.y;
    
    doc.save();
    doc.lineWidth(0.7);
    
    // Fill header background
    doc.rect(marginLeft, startY, totalWidth, rowHeight).fill(headerBgColor);
    
    // Draw all borders as continuous lines
    // Horizontal lines
    doc.moveTo(marginLeft, startY).lineTo(marginLeft + totalWidth, startY).stroke();
    doc.moveTo(marginLeft, startY + rowHeight).lineTo(marginLeft + totalWidth, startY + rowHeight).stroke();
    
    // Vertical lines
    columnPositions.forEach((x) => {
      doc.moveTo(x, startY).lineTo(x, startY + rowHeight).stroke();
    });
    
    // Draw header text
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
    const headerFontSize = 9;
    const textY = startY + (rowHeight - headerFontSize) / 2 - 2;
    
    columns.forEach((col, i) => {
      const x = columnPositions[i];
      const width = columnWidths[i];
      doc.text(col.label, x + 4, textY, { width: width - 8, align: 'center' });
    });
    
    doc.restore();
    doc.y = startY + rowHeight;
  };

  // Draw initial header
  drawTableHeader();
  let y = doc.y;

  sanitizedRows.forEach((row, rowIndex) => {
    // Check if we need a new page for this row
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      // Add new page
      doc.addPage();
      drawHeader(doc);
      doc.moveDown(0.8);
      
      // Draw header again on new page
      drawTableHeader();
      y = doc.y;
    }
    
    doc.save();
    doc.lineWidth(0.7);
    
    // Draw horizontal lines for this row
    doc.moveTo(marginLeft, y).lineTo(marginLeft + totalWidth, y).stroke();
    doc.moveTo(marginLeft, y + rowHeight).lineTo(marginLeft + totalWidth, y + rowHeight).stroke();
    
    // Draw vertical lines for this row
    columnPositions.forEach((x) => {
      doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
    });
    
    // Draw cell content
    columns.forEach((col, i) => {
      const value = formatValue(row[col.key]);
      const x = columnPositions[i];
      const width = columnWidths[i];
      const cellPadding = rowHeight > 30 ? 6 : 4;
      const cellFontSize = 8;
      const cellVerticalPadding = 4;
      
      doc.font('Helvetica').fontSize(cellFontSize).fillColor('#000000').text(
        value === 'N/A' ? '' : value, 
        x + cellPadding, 
        y + cellVerticalPadding, 
        {
          width: width - (cellPadding * 2),
          height: rowHeight - (cellVerticalPadding * 2),
          align: 'left',
          lineGap: 1,
          ellipsis: true
        }
      );
    });
    
    doc.restore();
    y += rowHeight;
  });

  doc.y = y + 10;
};

const drawLabelValueTable = (doc, rows = [], options = {}) => {
  if (!Array.isArray(rows) || !rows.length) {
    doc.font('Helvetica').fontSize(11).text('No data provided.');
    doc.moveDown();
    return;
  }

  const contentWidth = getContentWidth(doc);
  const marginLeft = doc.page.margins.left;
  const labelWidthRatio = options.labelWidthRatio || 0.35;
  const labelWidth = Math.round(contentWidth * labelWidthRatio);
  const valueWidth = contentWidth - labelWidth;
  const defaultRowHeight = options.rowHeight || 32;
  const defaultSubRowHeight = options.subRowHeight || 28;
  const subLabelWidthRatio = options.subLabelWidthRatio || 0.28;
  const subLabelWidth = Math.round(valueWidth * subLabelWidthRatio);
  const subValueWidth = valueWidth - subLabelWidth;

  rows.forEach((row) => {
    if (row?.subRows?.length) {
      const subRows = row.subRows;
      const totalHeight = subRows.reduce(
        (sum, subRow) => sum + (subRow.rowHeight || defaultSubRowHeight),
        0
      );

      ensureSpace(doc, totalHeight + 6);
      const startY = doc.y;

      doc.save();
      doc.lineWidth(0.5);

      doc.rect(marginLeft, startY, labelWidth, totalHeight).stroke();
      doc.font('Helvetica-Bold').fontSize(10).text(row.label || '', marginLeft + 4, startY + 6, {
        width: labelWidth - 8
      });

      doc.rect(marginLeft + labelWidth, startY, valueWidth, totalHeight).stroke();

      let currentY = startY;
      subRows.forEach((subRow, index) => {
        const subHeight = subRow.rowHeight || defaultSubRowHeight;
        if (index > 0) {
          doc
            .moveTo(marginLeft + labelWidth, currentY)
            .lineTo(marginLeft + labelWidth + valueWidth, currentY)
            .stroke();
        }

        const subLabelX = marginLeft + labelWidth;
        const subValueX = subLabelX + subLabelWidth;

        doc.moveTo(subValueX, currentY).lineTo(subValueX, currentY + subHeight).stroke();

        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(subRow.label || '', subLabelX + 4, currentY + 6, {
            width: subLabelWidth - 8
          });

        const formattedValue = formatValue(subRow.value);
        const subValueText = formattedValue === 'N/A' ? '' : formattedValue;
        doc
          .font('Helvetica')
          .fontSize(9)
          .text(subValueText, subValueX + 4, currentY + 6, {
            width: subValueWidth - 8
          });

        currentY += subHeight;
      });

      doc.restore();
      doc.y = startY + totalHeight;
    } else {
      const labelText = row.label || '';
      const formattedValue = formatValue(row.value);
      const valueText = formattedValue === 'N/A' ? '' : formattedValue;
      const rowHeight = row.rowHeight || defaultRowHeight;

      ensureSpace(doc, rowHeight + 6);
      const startY = doc.y;

      doc.save();
      doc.lineWidth(0.5);
      doc.rect(marginLeft, startY, labelWidth, rowHeight).stroke();
      doc.rect(marginLeft + labelWidth, startY, valueWidth, rowHeight).stroke();
      doc.font('Helvetica-Bold').fontSize(10).text(labelText, marginLeft + 4, startY + 6, {
        width: labelWidth - 8
      });
      doc.font('Helvetica').fontSize(9).text(valueText, marginLeft + labelWidth + 4, startY + 6, {
        width: valueWidth - 8
      });
      doc.restore();
      doc.y = startY + rowHeight;
    }
  });

  doc.moveDown(0.5);
};

const drawNumberedProjectTable = (doc, rows = [], options = {}) => {
  if (!Array.isArray(rows) || !rows.length) {
    doc.font('Helvetica').fontSize(11).text('No data provided.');
    doc.moveDown();
    return;
  }

  const contentWidth = getContentWidth(doc);
  const marginLeft = doc.page.margins.left;
  const numberWidth = Math.round(contentWidth * (options.numberWidthRatio || 0.08));
  const labelWidth = Math.round(contentWidth * (options.labelWidthRatio || 0.42));
  const valueWidth = contentWidth - numberWidth - labelWidth;
  const defaultRowHeight = options.rowHeight || 32;

  rows.forEach((row) => {
    const rowHeight = row.rowHeight || defaultRowHeight;
    ensureSpace(doc, rowHeight + 6);
    const startY = doc.y;

    const numberText = row.number || '';
    const labelText = row.label || '';
    const leftValueRaw = formatValue(row.leftValue);
    const leftValueText = leftValueRaw === 'N/A' ? '' : leftValueRaw;
    const rightValueRaw = formatValue(row.rightValue);
    const rightValueText = rightValueRaw === 'N/A' ? '' : rightValueRaw;

    doc.save();
    doc.lineWidth(0.5);

    // Number column
    doc.rect(marginLeft, startY, numberWidth, rowHeight).stroke();
    doc.font('Helvetica-Bold').fontSize(9).text(numberText, marginLeft + 4, startY + 6, {
      width: numberWidth - 8
    });

    // Label column
    const labelX = marginLeft + numberWidth;
    doc.rect(labelX, startY, labelWidth, rowHeight).stroke();
    doc.font('Helvetica-Bold').fontSize(9).text(labelText, labelX + 4, startY + 6, {
      width: labelWidth - 8
    });
    if (leftValueText) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(leftValueText, labelX + 4, startY + 24, {
          width: labelWidth - 8
        });
    }

    // Value column
    const valueX = labelX + labelWidth;
    doc.rect(valueX, startY, valueWidth, rowHeight).stroke();
    let rightY = startY + 6;
    if (row.rightLabel) {
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(row.rightLabel, valueX + 4, rightY, {
          width: valueWidth - 8
        });
      rightY += 18;
    }
    if (rightValueText) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(rightValueText, valueX + 4, rightY, {
          width: valueWidth - 8
        });
    }

    doc.restore();
    doc.y = startY + rowHeight;
  });

  doc.moveDown(0.5);
};

const performanceFrameworkEntriesToObject = (entries = []) =>
  Array.isArray(entries)
    ? entries.reduce((acc, entry) => {
        if (entry && entry.key) {
          acc[entry.key] = entry.value || '';
        }
        return acc;
      }, {})
    : {};

const drawPerformanceFrameworkTable = (doc, entries = [], options = {}) => {
  const columns = [
    { label: 'Hierarchy of targeted results₁', widthRatio: 0.22 },
    { label: 'Objectively verifiable indicators (OVI)₂', widthRatio: 0.17 },
    { label: 'Baseline data₃', widthRatio: 0.16 },
    { label: 'Targets₄', widthRatio: 0.16 },
    { label: 'Data collection methods₅', widthRatio: 0.14 },
    { label: 'Responsibility to collect data₆', widthRatio: 0.15 }
  ];

  const data = performanceFrameworkEntriesToObject(entries);

  const cleanValue = (value) => {
    const formatted = formatValue(value);
    return formatted === 'N/A' ? '' : formatted;
  };

  const joinValues = (...values) => {
    const parts = values
      .map(cleanValue)
      .filter((part) => part && part.trim() !== '');
    return parts.join('\n\n');
  };

  const headerHeight = options.headerHeight || 42;
  const rowHeights = options.rowHeights || [150, 150];

  const rowValues = [
    [
      cleanValue(data.perf_g1_results),
      joinValues(data.perf_g1_indicators_a, data.perf_g1_indicators_b),
      joinValues(data.perf_g1_baseline_a, data.perf_g1_baseline_b),
      joinValues(data.perf_g1_targets_a, data.perf_g1_targets_b),
      cleanValue(data.perf_g1_methods),
      cleanValue(data.perf_g1_responsibility)
    ],
    [
      joinValues(data.perf_g2_results, data.perf_g3_results),
      joinValues(
        data.perf_g2_indicators_a,
        data.perf_g2_indicators_b,
        data.perf_g3_indicators_a,
        data.perf_g3_indicators_b,
        data.perf_g3_indicators_c
      ),
      joinValues(
        data.perf_g2_baseline_a,
        data.perf_g2_baseline_b,
        data.perf_g3_baseline_a,
        data.perf_g3_baseline_b,
        data.perf_g3_baseline_c
      ),
      joinValues(
        data.perf_g2_targets_a,
        data.perf_g2_targets_b,
        data.perf_g3_targets_a,
        data.perf_g3_targets_b,
        data.perf_g3_targets_c
      ),
      joinValues(data.perf_g2_methods, data.perf_g3_methods),
      joinValues(data.perf_g2_responsibility, data.perf_g3_responsibility)
    ]
  ];

  const contentWidth = getContentWidth(doc);
  const marginLeft = doc.page.margins.left;
  const computedColumns = columns.map((col) => ({
    ...col,
    width: Math.round((col.widthRatio || (1 / columns.length)) * contentWidth)
  }));
  const columnPositions = computedColumns.reduce((positions, col, index) => {
    if (index === 0) {
      positions.push(marginLeft);
    } else {
      positions.push(positions[index - 1] + computedColumns[index - 1].width);
    }
    return positions;
  }, []);
  const totalRowsHeight = rowHeights.reduce((sum, height) => sum + height, 0);
  const totalHeight = headerHeight + totalRowsHeight;

  ensureSpace(doc, totalHeight + 12);

  let x = marginLeft;
  let y = doc.y;

  doc.save();
  doc.lineWidth(0.5);
  doc.rect(x, y, contentWidth, headerHeight).fillAndStroke('#f4f4f4', '#000000');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
  computedColumns.forEach((col) => {
    doc.text(col.label, x + 4, y + 6, { width: col.width - 8, align: 'left' });
    x += col.width;
    doc.moveTo(x, y).lineTo(x, y + headerHeight).stroke();
  });
  doc.restore();

  y += headerHeight;
  doc.y = y;

  rowValues.forEach((cells, rowIndex) => {
    const rowHeight = rowHeights[rowIndex] || rowHeights[rowHeights.length - 1];
    ensureSpace(doc, rowHeight + 6);
    const rowY = doc.y;

    cells.forEach((cellText, colIndex) => {
      const column = computedColumns[colIndex];
      if (!column) {
        return;
      }
      const cellX = columnPositions[colIndex];

      doc.save();
      doc.lineWidth(0.5);
      doc.rect(cellX, rowY, column.width, rowHeight).stroke();

      const text = cleanValue(cellText);
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(text, cellX + 4, rowY + 6, {
          width: column.width - 8,
          height: rowHeight - 12
        });
      doc.restore();
    });

    doc.y = rowY + rowHeight;
  });

  doc.moveDown(0.5);
};

const drawDeploymentTable = (doc, rows = [], options = {}) => {
  const sanitizedRows = sanitizeRows(rows);
  const minRows = options.minRows || 7;
  const rowsToRender = (() => {
    if (!sanitizedRows.length) {
      return Array.from({ length: minRows }, () => ({}));
    }
    if (sanitizedRows.length >= minRows) {
      return sanitizedRows;
    }
    const padded = [...sanitizedRows];
    while (padded.length < minRows) {
      padded.push({});
    }
    return padded;
  })();

  const contentWidth = getContentWidth(doc);
  const marginLeft = doc.page.margins.left;
  const columnWidths = [
    Math.round(contentWidth * 0.36),
    Math.round(contentWidth * 0.26),
    Math.round(contentWidth * 0.12),
    Math.round(contentWidth * 0.12),
    Math.round(contentWidth * 0.14)
  ];
  const headerTopHeight = options.headerTopHeight || 46;
  const headerBottomHeight = options.headerBottomHeight || 24;
  const minRowHeight = options.minRowHeight || 22;

  const estimatedHeight =
    headerTopHeight +
    headerBottomHeight +
    rowsToRender.length * (minRowHeight + 2) +
    12;
  ensureSpace(doc, estimatedHeight);

  const startY = doc.y;
  const yearGroupWidth = columnWidths.slice(2).reduce((sum, width) => sum + width, 0);
  const yearGroupX = marginLeft + columnWidths[0] + columnWidths[1];

  doc.save();
  doc.lineWidth(0.5);

  // Top header rectangles
  doc.rect(marginLeft, startY, columnWidths[0], headerTopHeight).stroke();
  doc.rect(marginLeft + columnWidths[0], startY, columnWidths[1], headerTopHeight + headerBottomHeight).stroke();
  doc.rect(yearGroupX, startY, yearGroupWidth, headerTopHeight).stroke();

  // Divide the year group into individual columns and extend through both header rows
  let dividerX = yearGroupX;
  columnWidths.slice(2).forEach((width) => {
    dividerX += width;
    doc.moveTo(dividerX, startY).lineTo(dividerX, startY + headerTopHeight + headerBottomHeight).stroke();
  });

  // Bottom header rectangles
  doc.rect(marginLeft, startY + headerTopHeight, columnWidths[0], headerBottomHeight).stroke();
  doc.rect(yearGroupX, startY + headerTopHeight, yearGroupWidth, headerBottomHeight).stroke();

  doc.restore();

  // Header text
  doc.font('Helvetica-Bold').fontSize(11).text('I T E M₁', marginLeft + 4, startY + 6, {
    width: columnWidths[0] - 8,
    align: 'center'
  });
  doc.font('Helvetica').fontSize(8).text('(Allotment Class/ Object of Expenditures)', marginLeft + 6, startY + 22, {
    width: columnWidths[0] - 12,
    align: 'center'
  });
  doc.font('Helvetica-Oblique').fontSize(8).text('Examples:', marginLeft + 6, startY + headerTopHeight + 6, {
    width: columnWidths[0] - 12,
    align: 'left'
  });

  doc.font('Helvetica-Bold').fontSize(10).text('NAME OF OFFICE/\nORGANIZATIONAL UNITS₂', marginLeft + columnWidths[0] + 4, startY + 12, {
    width: columnWidths[1] - 8,
    align: 'center'
  });

  doc.font('Helvetica-Bold').fontSize(10).text('PROPOSED NUMBER\nOF UNITS₃', yearGroupX + 4, startY + 10, {
    width: yearGroupWidth - 8,
    align: 'center'
  });

  const yearLabels = ['YEAR 1', 'YEAR 2', 'YEAR 3'];
  let labelX = yearGroupX;
  columnWidths.slice(2).forEach((width, index) => {
    doc.font('Helvetica-Bold').fontSize(9).text(yearLabels[index], labelX + 4, startY + headerTopHeight + 6, {
      width: width - 8,
      align: 'center'
    });
    labelX += width;
  });

  doc.y = startY + headerTopHeight + headerBottomHeight;

  const cleanCellValue = (value) => {
    const formatted = formatValue(value);
    return formatted === 'N/A' ? '' : formatted;
  };

  const textHeight = (text, width) => {
    const content = text && String(text).trim() !== '' ? String(text) : ' ';
    return doc.heightOfString(content, {
      width,
      align: 'left'
    });
  };

  rowsToRender.forEach((row) => {
    const values = [
      cleanCellValue(row.item),
      cleanCellValue(row.office),
      cleanCellValue(row.year1),
      cleanCellValue(row.year2),
      cleanCellValue(row.year3)
    ];

    doc.font('Helvetica').fontSize(9);
    const heights = [
      textHeight(values[0], columnWidths[0] - 8),
      textHeight(values[1], columnWidths[1] - 8),
      textHeight(values[2], columnWidths[2] - 8),
      textHeight(values[3], columnWidths[3] - 8),
      textHeight(values[4], columnWidths[4] - 8)
    ];

    const rowHeight = Math.max(minRowHeight, Math.max(...heights) + 6);
    ensureSpace(doc, rowHeight + 6);

    const rowY = doc.y;
    let cellX = marginLeft;

    values.forEach((text, index) => {
      const width = columnWidths[index];
      doc.rect(cellX, rowY, width, rowHeight).stroke();
      doc.font('Helvetica').fontSize(9).text(text, cellX + 4, rowY + 4, {
        width: width - 8,
        align: index >= 2 ? 'center' : 'left'
      });
      cellX += width;
    });

    doc.y = rowY + rowHeight;
  });

  doc.moveDown(0.5);
};

const drawSummaryInvestmentsTable = (doc, rows = [], options = {}) => {
  const sanitizedRows = sanitizeRows(rows);
  const defaultMinRows = options.minRows !== undefined
    ? options.minRows
    : (sanitizedRows.length ? sanitizedRows.length : 3);
  const minRows = Math.max(defaultMinRows, 0);
  const rowsToRender = (() => {
    if (!sanitizedRows.length) {
      return Array.from({ length: Math.max(minRows, 3) }, () => ({}));
    }
    if (sanitizedRows.length >= minRows) {
      return sanitizedRows;
    }
    const padded = [...sanitizedRows];
    while (padded.length < minRows) {
      padded.push({});
    }
    return padded;
  })();

  const originalFontSize = doc._fontSize || 12;
  const originalFontName =
    (doc._font && (doc._font.postscriptName || doc._font.fullName || doc._font.name)) ||
    'Helvetica';

  const contentWidth = getContentWidth(doc);
  const marginLeft = doc.page.margins.left;
  const columnWidthRatios = [
    0.35,
    0.11,
    0.11,
    0.11,
    0.11,
    0.11,
    0.10
  ];
  const columnWidths = columnWidthRatios.map((ratio) => Math.round(contentWidth * ratio));
  const headerTopHeight = options.headerTopHeight || 38;
  const headerBottomHeight = options.headerBottomHeight || 26;
  const minRowHeight = options.minRowHeight || 34;

  const estimatedHeight =
    headerTopHeight +
    headerBottomHeight +
    rowsToRender.length * (minRowHeight + 2) +
    12;
  ensureSpace(doc, estimatedHeight);

  const startY = doc.y;
  const columnPositions = [marginLeft];
  columnWidths.forEach((width) => {
    columnPositions.push(columnPositions[columnPositions.length - 1] + width);
  });
  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);

  const drawCentered = (text, x, y, width, height, textOptions = {}) => {
    const optionsWithDefaults = {
      width,
      align: textOptions.align || 'center',
      lineGap: textOptions.lineGap || 0,
      characterSpacing: textOptions.characterSpacing
    };
    const textHeight = doc.heightOfString(text, optionsWithDefaults);
    const textY = y + Math.max(0, (height - textHeight) / 2);
    doc.text(text, x, textY, optionsWithDefaults);
  };

  doc.save();
  doc.lineWidth(0.5);

  // Outline first column header (spans both rows)
  doc.rect(marginLeft, startY, columnWidths[0], headerTopHeight + headerBottomHeight).stroke();
  doc.moveTo(marginLeft, startY + headerTopHeight).lineTo(marginLeft + columnWidths[0], startY + headerTopHeight).stroke();

  // Draw grouped year headers and sub headers
  for (let i = 0; i < 3; i += 1) {
    const groupStartIndex = 1 + i * 2;
    const groupX = columnPositions[groupStartIndex];
    const groupWidth = columnWidths[groupStartIndex] + columnWidths[groupStartIndex + 1];

    doc.rect(groupX, startY, groupWidth, headerTopHeight).stroke();
    doc.rect(groupX, startY + headerTopHeight, columnWidths[groupStartIndex], headerBottomHeight).stroke();
    doc.rect(groupX + columnWidths[groupStartIndex], startY + headerTopHeight, columnWidths[groupStartIndex + 1], headerBottomHeight).stroke();
  }

  // Draw bottom line for header
  doc.moveTo(marginLeft, startY + headerTopHeight + headerBottomHeight).lineTo(marginLeft + totalWidth, startY + headerTopHeight + headerBottomHeight).stroke();

  doc.restore();

  // Header text
  doc.font('Helvetica-Bold').fontSize(10);
  drawCentered('ITEM₁', marginLeft + 6, startY, columnWidths[0] - 12, headerTopHeight, { align: 'center' });
  doc.font('Helvetica').fontSize(7.5);
  drawCentered('(Allotment Class/Object of Expenditures)', marginLeft + 6, startY + headerTopHeight, columnWidths[0] - 12, headerBottomHeight, { align: 'center', lineGap: 1.1 });

  const yearLabels = ['YEAR 1₁', 'YEAR 2₂', 'YEAR 3₃'];
  for (let i = 0; i < 3; i += 1) {
    const groupStartIndex = 1 + i * 2;
    const groupX = columnPositions[groupStartIndex];
    const groupWidth = columnWidths[groupStartIndex] + columnWidths[groupStartIndex + 1];
    doc.font('Helvetica-Bold').fontSize(9.2);
    drawCentered(yearLabels[i], groupX, startY, groupWidth, headerTopHeight, { align: 'center' });

    doc.font('Helvetica-Bold').fontSize(8.2);
    drawCentered('PHYSICAL\nTARGETS', groupX + 4, startY + headerTopHeight, columnWidths[groupStartIndex] - 8, headerBottomHeight, { align: 'center', lineGap: 1.2 });
    drawCentered('COST', groupX + columnWidths[groupStartIndex] + 4, startY + headerTopHeight, columnWidths[groupStartIndex + 1] - 8, headerBottomHeight, { align: 'center' });
  }

  doc.y = startY + headerTopHeight + headerBottomHeight;

  const cleanCellValue = (value) => {
    const formatted = formatValue(value);
    return formatted === 'N/A' ? '' : formatted;
  };

  const textHeight = (text, width, fontSize = 8.2) => {
    const content = text && String(text).trim() !== '' ? String(text) : ' ';
    return doc.heightOfString(content, {
      width,
      align: 'left',
      lineGap: 2,
      characterSpacing: 0,
      continued: false
    });
  };

  doc.save();
  doc.lineWidth(0.4);

  rowsToRender.forEach((row) => {
    const values = [
      cleanCellValue(row.item),
      cleanCellValue(row.year1Physical),
      cleanCellValue(row.year1Cost),
      cleanCellValue(row.year2Physical),
      cleanCellValue(row.year2Cost),
      cleanCellValue(row.year3Physical),
      cleanCellValue(row.year3Cost)
    ];

    const alignments = ['left', 'center', 'center', 'center', 'center', 'center', 'center'];

    doc.font('Helvetica').fontSize(8.2);
    const heights = values.map((text, index) =>
      textHeight(text, columnWidths[index] - 12)
    );
    const rowHeight = Math.max(minRowHeight, Math.max(...heights) + 10);
    ensureSpace(doc, rowHeight + 8);

    const rowY = doc.y;
    let cellX = marginLeft;
    values.forEach((text, index) => {
      const width = columnWidths[index];
      doc.rect(cellX, rowY, width, rowHeight).stroke();
      doc.font('Helvetica').fontSize(8.2).text(text, cellX + 6, rowY + 6, {
        width: width - 12,
        align: alignments[index],
        lineGap: 1.6
      });
      cellX += width;
    });
    doc.y = rowY + rowHeight;
  });

  doc.restore();

  doc.moveDown(0.5);
  doc.font(originalFontName).fontSize(originalFontSize);
};

// Helper function to check if a section is complete
const checkSectionCompletion = (section, sectionType) => {
  switch (sectionType) {
    case 'organizationalProfile':
      const pageA = section.pageA || {};
      const pageB = section.pageB || {};
      const pageC = section.pageC || {};
      const pageD = section.pageD || {};
      const pageE = section.pageE || {};
      const strategicConcerns = parseStrategicConcerns(pageE.strategicConcerns);
      
      const isPageAComplete = 
        hasAllStrings(pageA, ['mandate', 'visionStatement', 'missionStatement', 'majorFinalOutput']);
      
      const isPageBComplete = 
        hasAllStrings(pageB, ['plannerName', 'plantillaPosition', 'organizationalUnit', 'emailAddress', 'contactNumbers']);

      const isPageCComplete = hasAnyRowData(pageC.tableData) || hasNonEmptyString(pageC.functionalInterfaceChartUrl);

      const isPageDComplete = hasNonEmptyString(pageD.strategicChallenges);

      const strategicConcernsArray = Array.isArray(strategicConcerns) ? strategicConcerns : (strategicConcerns && typeof strategicConcerns === 'object' && !Array.isArray(strategicConcerns) ? [strategicConcerns] : []);
      const isPageEComplete = strategicConcernsArray.length > 0 && strategicConcernsArray.some((row) =>
        hasAllStrings(row, ['majorFinalOutput', 'criticalSystems', 'problems', 'intendedUse'])
      );
      
      return (isPageAComplete && isPageBComplete && isPageCComplete && isPageDComplete && isPageEComplete)
        ? 'complete'
        : 'in_progress';
    
    case 'informationSystemsStrategy':
      const pageB_IS = section.pageB || {};
      const pageA_IS = section.pageA || {};
      const pageC_IS = section.pageC || {};
      const pageD_IS = section.pageD || {};

      const isPageA_IS_Complete = hasNonEmptyString(pageA_IS.diagramUrl);
      const isPageB_IS_Complete = hasAllStrings(pageB_IS, [
        'name',
        'description',
        'status',
        'developmentStrategy',
        'computingScheme',
        'usersInternal',
        'usersExternal',
        'systemOwner'
      ]);
      const isPageC_IS_Complete = hasAllStrings(pageC_IS, [
        'databaseName',
        'generalContents',
        'status',
        'informationSystemsServed',
        'dataArchiving',
        'usersInternal',
        'usersExternal',
        'owner'
      ]);
      const isPageD_IS_Complete = hasNonEmptyString(pageD_IS.networkLayoutUrl);

      return (isPageA_IS_Complete && isPageB_IS_Complete && isPageC_IS_Complete && isPageD_IS_Complete)
        ? 'complete'
        : 'in_progress';
    
    case 'detailedIctProjects':
      const internal = section.internal || {};
      const crossAgency = section.crossAgency || {};
      const performance = section.performance || {};

      const isInternalComplete = hasAllStrings(internal, ['nameTitle', 'rank', 'objectives', 'duration', 'deliverables']);
      const isCrossAgencyComplete = hasAllStrings(crossAgency, ['nameTitle', 'objectives', 'duration', 'deliverables', 'leadAgency', 'implementingAgencies']);
      const frameworkData = Array.isArray(performance.frameworkData) ? performance.frameworkData : [];
      const isPerformanceComplete = frameworkData.length > 0 && frameworkData.every((entry) => hasNonEmptyString(entry?.value));

      return (isInternalComplete && isCrossAgencyComplete && isPerformanceComplete)
        ? 'complete'
        : 'in_progress';
    
    case 'resourceRequirements':
      const pageB_RR = section.pageB || {};
      const pageA_RR = section.pageA || {};
      const pageC_RR = section.pageC || {};

      const isDeploymentComplete = hasAnyRowData(pageA_RR.deploymentData);
      const hasExistingStructure = hasNonEmptyString(pageB_RR.existingStructureUrl);
      const hasProposedStructure = hasNonEmptyString(pageB_RR.proposedStructureUrl);
      const isStructureComplete = hasExistingStructure && hasProposedStructure;
      const isPlacementComplete = hasNonEmptyString(pageC_RR.placementStructureUrl);

      return (isDeploymentComplete && isStructureComplete && isPlacementComplete)
        ? 'complete'
        : 'in_progress';
    
    case 'developmentInvestmentProgram':
      const pageA_DIP = section.pageA || {};
      const pageB_DIP = section.pageB || {};
      const pageC_DIP = section.pageC || {};

      const projectScheduleComplete = hasAnyRowData(pageA_DIP.projectSchedule);
      const isScheduleComplete = hasAnyRowData(pageA_DIP.isSchedule);
      const summaryComplete = hasAnyRowData(pageB_DIP.summaryInvestments);
      const costComplete = hasAnyRowData(pageC_DIP.costBreakdown);

      return (projectScheduleComplete && isScheduleComplete && summaryComplete && costComplete)
        ? 'complete'
        : 'in_progress';
    
    default:
      return 'in_progress';
  }
};

// GET ISSP data for current user
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let issp = await getISSPForUser(user);
    
    // Ensure unit is set (for migration of existing data)
    if (!issp.unit && user.unit) {
      issp.unit = user.unit;
      await issp.save();
    }

    if (!issp.review) {
      issp.review = {
        status: 'draft',
        submittedAt: null,
        decidedAt: null,
        decidedBy: null,
        decisionNotes: ''
      };
      await issp.save();
    }
    
    res.json(issp);
  } catch (error) {
    console.error('Error fetching ISSP:', error);
    res.status(500).json({ message: 'Error fetching ISSP data', error: error.message });
  }
});

// GET ISSP sections status (for the main ISSP page)
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let issp = await getISSPForUser(user);
    
    // Ensure unit is set (for migration of existing data)
    if (!issp.unit && user.unit) {
      issp.unit = user.unit;
      await issp.save();
    }
    
    const sections = [
      {
        id: 1,
        title: "ORGANIZATIONAL PROFILE",
        status: issp.organizationalProfile.status
      },
      {
        id: 2,
        title: "RESOURCE REQUIREMENTS",
        status: issp.resourceRequirements.status
      },
      {
        id: 3,
        title: "INFORMATION SYSTEMS STRATEGY",
        status: issp.informationSystemsStrategy.status
      },
      {
        id: 4,
        title: "DEVELOPMENT AND INVESTMENT PROGRAM",
        status: issp.developmentInvestmentProgram.status
      },
      {
        id: 5,
        title: "DETAILED DESCRIPTION OF ICT PROJECT",
        status: issp.detailedIctProjects.status
      }
    ];
    
    res.json(sections);
  } catch (error) {
    console.error('Error fetching ISSP status:', error);
    res.status(500).json({ message: 'Error fetching ISSP status', error: error.message });
  }
});

router.post('/review/submit', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can submit ISSP for review' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let issp = await getISSPForUser(user);

    if (!issp) {
      return res.status(404).json({ message: 'ISSP data not found' });
    }

    if (!issp.review) {
      issp.review = {};
    }

    if (issp.review.status === 'pending') {
      return res.status(400).json({ message: 'ISSP is already awaiting presidential review' });
    }

    issp.review.status = 'pending';
    issp.review.submittedAt = new Date();
    issp.review.decidedAt = null;
    issp.review.decidedBy = null;
    issp.review.decisionNotes = '';

    await issp.save();

    // Create notification for the president
    try {
      // Find the president user (accept both 'president' and 'Executive' roles)
      const president = await User.findOne({ 
        $or: [
          { role: 'president' },
          { role: 'Executive' }
        ]
      });
      
      if (president) {
        await Notification.create({
          userId: president._id,
          unit: req.user.unit || null, // Store unit for department account access
          type: 'issp_submitted_for_review',
          title: 'ISSP Submitted for Review',
          message: `${req.user.username} (${req.user.unit || 'Administration'}) has submitted an ISSP for your review.`,
          isspId: issp._id
        });
      }
    } catch (error) {
      console.error('Error creating president notification:', error);
      // Don't fail the request if notification creation fails
    }

    await logAuditEvent({
      actor: req.user,
      action: 'issp_submitted_for_review',
      description: 'Submitted ISSP for presidential review',
      target: { type: 'issp', id: issp._id.toString(), name: req.user.id },
      metadata: {
        reviewStatus: issp.review.status,
        submittedAt: issp.review.submittedAt
      }
    });

    res.json({ review: issp.review });
  } catch (error) {
    console.error('Error submitting ISSP for review:', error);
    res.status(500).json({ message: 'Error submitting ISSP for review', error: error.message });
  }
});

router.get('/review/list', auth, async (req, res) => {
  try {
    // Accept both 'president' and 'Executive' roles for president access
    if (req.user.role !== 'president' && req.user.role !== 'Executive') {
      return res.status(403).json({ message: 'Only the president can access ISSP reviews' });
    }

    const issps = await ISSP.find({ 'review.status': { $ne: 'draft' } })
      .populate('userId', 'username email unit')
      .populate('review.decidedBy', 'username email')
      .sort({
        'review.submittedAt': -1,
        updatedAt: -1
      });

    res.json(issps);
  } catch (error) {
    console.error('Error fetching ISSP reviews:', error);
    res.status(500).json({ message: 'Error fetching ISSP reviews', error: error.message });
  }
});

router.post('/review/decision', auth, async (req, res) => {
  try {
    // Accept both 'president' and 'Executive' roles for president access
    if (req.user.role !== 'president' && req.user.role !== 'Executive') {
      return res.status(403).json({ message: 'Only the president can record a decision' });
    }

    const { isspId, status, notes } = req.body || {};

    if (!isspId || !mongoose.Types.ObjectId.isValid(isspId)) {
      return res.status(400).json({ message: 'A valid ISSP identifier is required' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Decision status must be either approved or rejected' });
    }

    const issp = await ISSP.findById(isspId);

    if (!issp) {
      return res.status(404).json({ message: 'ISSP not found' });
    }

    if (!issp.review || issp.review.status !== 'pending') {
      return res.status(400).json({ message: 'ISSP is not awaiting review' });
    }

    issp.review.status = status;
    issp.review.decidedAt = new Date();
    issp.review.decidedBy = req.user.id;
    issp.review.decisionNotes = notes || '';

    await issp.save();

    await issp.populate('review.decidedBy', 'username email');
    await issp.populate('userId', 'username email unit');

    // Create notification for the admin who submitted the ISSP
    const notificationType = status === 'approved' ? 'issp_approved' : 'issp_rejected';
    const notificationTitle = status === 'approved' 
      ? 'ISSP Approved' 
      : 'ISSP Rejected';
    const notificationMessage = status === 'approved'
      ? `The president has approved your ISSP submission.${notes ? ' Notes: ' + notes : ''}`
      : `The president has rejected your ISSP submission.${notes ? ' Reason: ' + notes : ''}`;

    try {
      // Get the unit from the ISSP or user
      const isspUser = await User.findById(issp.userId._id || issp.userId).select('unit');
      await Notification.create({
        userId: issp.userId._id || issp.userId,
        unit: issp.unit || isspUser?.unit || null, // Store unit for department account access
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        isspId: issp._id
      });
    } catch (error) {
      console.error('Error creating ISSP notification:', error);
      // Don't fail the request if notification creation fails
    }

    await logAuditEvent({
      actor: req.user,
      action: 'issp_review_decision',
      description: `Recorded ISSP decision: ${status}`,
      target: { type: 'issp', id: issp._id.toString(), name: issp.userId?.toString() || issp._id.toString() },
      metadata: {
        status,
        notes,
        decidedAt: issp.review.decidedAt
      }
    });

    res.json({ review: issp.review });
  } catch (error) {
    console.error('Error recording ISSP decision:', error);
    res.status(500).json({ message: 'Error recording ISSP decision', error: error.message });
  }
});

// UPDATE Organizational Profile
router.put('/organizational-profile', auth, async (req, res) => {
  try {
    console.log('Received request to update organizational profile');
    console.log('User ID:', req.user.id);
    console.log('Request body:', req.body);
    
    const { pageA, pageB, pageC, pageD, pageE } = req.body;
    let normalizedPageE = pageE;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let issp = await getISSPForUser(user);
    
    // Ensure unit is set (for migration of existing data)
    if (!issp.unit && user.unit) {
      issp.unit = user.unit;
    }
    
    if (!issp) {
      console.log('No existing ISSP found, creating new one');
      issp = new ISSP({ userId: user._id, unit: user.unit });
    } else {
      console.log('Found existing ISSP:', issp._id);
    }

    const previousProfile = deepClone(issp.organizationalProfile || {});
    
    // Update the data
    if (pageA) {
      console.log('Updating Page A with:', pageA);
      issp.organizationalProfile.pageA = { ...issp.organizationalProfile.pageA, ...pageA };
    }
    if (pageB) {
      console.log('Updating Page B with:', pageB);
      issp.organizationalProfile.pageB = { ...issp.organizationalProfile.pageB, ...pageB };
    }
    if (pageC) {
      console.log('Updating Page C with:', pageC);
      issp.organizationalProfile.pageC = { ...issp.organizationalProfile.pageC, ...pageC };
    }
    if (pageD) {
      console.log('Updating Page D with:', pageD);
      issp.organizationalProfile.pageD = { ...issp.organizationalProfile.pageD, ...pageD };
    }
    if (normalizedPageE) {
      if (normalizedPageE.strategicConcerns !== undefined) {
        const strategicArray = parseStrategicConcerns(normalizedPageE.strategicConcerns);
        normalizedPageE = {
          ...normalizedPageE,
          strategicConcerns: strategicArray
        };
      }
      console.log('Updating Page E with:', normalizedPageE);
      issp.organizationalProfile.pageE = {
        ...issp.organizationalProfile.pageE,
        ...normalizedPageE
      };
    }
    
    // Auto-update status based on completion
    const oldStatus = issp.organizationalProfile.status;
    issp.organizationalProfile.status = checkSectionCompletion(issp.organizationalProfile, 'organizationalProfile');
    console.log('Status changed from', oldStatus, 'to', issp.organizationalProfile.status);
    
    await issp.save();
    console.log('ISSP saved successfully');

    const sectionKey = 'organizationalProfile';
    const isspId = issp._id.toString();
    await Promise.all([
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageA',
        previousValue: previousProfile.pageA,
        currentValue: issp.organizationalProfile.pageA,
        patchValue: pageA
      }),
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageB',
        previousValue: previousProfile.pageB,
        currentValue: issp.organizationalProfile.pageB,
        patchValue: pageB
      }),
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageC',
        previousValue: previousProfile.pageC,
        currentValue: issp.organizationalProfile.pageC,
        patchValue: pageC
      }),
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageD',
        previousValue: previousProfile.pageD,
        currentValue: issp.organizationalProfile.pageD,
        patchValue: pageD
      }),
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageE',
        previousValue: previousProfile.pageE,
        currentValue: issp.organizationalProfile.pageE,
        patchValue: normalizedPageE
      })
    ]);
    
    res.json(issp);
  } catch (error) {
    console.error('Error updating organizational profile:', error);
    res.status(500).json({ message: 'Error updating organizational profile', error: error.message });
  }
});

// UPDATE Information Systems Strategy
router.put('/information-systems-strategy', auth, async (req, res) => {
  try {
    const { pageA, pageB, pageC, pageD } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let issp = await getISSPForUser(user);
    
    // Ensure unit is set (for migration of existing data)
    if (!issp.unit && user.unit) {
      issp.unit = user.unit;
    }

    const previousSection = deepClone(issp.informationSystemsStrategy || {});
    
    // Update the data
    if (pageA) issp.informationSystemsStrategy.pageA = { ...issp.informationSystemsStrategy.pageA, ...pageA };
    if (pageB) issp.informationSystemsStrategy.pageB = { ...issp.informationSystemsStrategy.pageB, ...pageB };
    if (pageC) issp.informationSystemsStrategy.pageC = { ...issp.informationSystemsStrategy.pageC, ...pageC };
    if (pageD) issp.informationSystemsStrategy.pageD = { ...issp.informationSystemsStrategy.pageD, ...pageD };
    
    // Auto-update status
    issp.informationSystemsStrategy.status = checkSectionCompletion(issp.informationSystemsStrategy, 'informationSystemsStrategy');
    
    await issp.save();

    const sectionKey = 'informationSystemsStrategy';
    const isspId = issp._id.toString();
    await Promise.all([
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageA',
        previousValue: previousSection.pageA,
        currentValue: issp.informationSystemsStrategy.pageA,
        patchValue: pageA
      }),
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageB',
        previousValue: previousSection.pageB,
        currentValue: issp.informationSystemsStrategy.pageB,
        patchValue: pageB
      }),
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageC',
        previousValue: previousSection.pageC,
        currentValue: issp.informationSystemsStrategy.pageC,
        patchValue: pageC
      }),
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageD',
        previousValue: previousSection.pageD,
        currentValue: issp.informationSystemsStrategy.pageD,
        patchValue: pageD
      })
    ]);
    
    res.json(issp);
  } catch (error) {
    console.error('Error updating information systems strategy:', error);
    res.status(500).json({ message: 'Error updating information systems strategy', error: error.message });
  }
});

// UPDATE Detailed ICT Projects
router.put('/detailed-ict-projects', auth, async (req, res) => {
  try {
    const { internal, crossAgency, performance } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let issp = await getISSPForUser(user);
    
    // Ensure unit is set (for migration of existing data)
    if (!issp.unit && user.unit) {
      issp.unit = user.unit;
    }

    const previousSection = deepClone(issp.detailedIctProjects || {});
    
    // Update the data
    if (internal) issp.detailedIctProjects.internal = { ...issp.detailedIctProjects.internal, ...internal };
    if (crossAgency) issp.detailedIctProjects.crossAgency = { ...issp.detailedIctProjects.crossAgency, ...crossAgency };
    if (performance) issp.detailedIctProjects.performance = performance;
    
    // Auto-update status
    issp.detailedIctProjects.status = checkSectionCompletion(issp.detailedIctProjects, 'detailedIctProjects');
    
    await issp.save();

    const sectionKey = 'detailedIctProjects';
    const isspId = issp._id.toString();
    await Promise.all([
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'internal',
        previousValue: previousSection.internal,
        currentValue: issp.detailedIctProjects.internal,
        patchValue: internal
      }),
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'crossAgency',
        previousValue: previousSection.crossAgency,
        currentValue: issp.detailedIctProjects.crossAgency,
        patchValue: crossAgency
      }),
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'performance',
        previousValue: previousSection.performance,
        currentValue: issp.detailedIctProjects.performance,
        patchValue: performance
      })
    ]);
    
    res.json(issp);
  } catch (error) {
    console.error('Error updating detailed ICT projects:', error);
    res.status(500).json({ message: 'Error updating detailed ICT projects', error: error.message });
  }
});

// UPDATE Resource Requirements
router.put('/resource-requirements', auth, async (req, res) => {
  try {
    const { pageA, pageB, pageC } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let issp = await getISSPForUser(user);
    
    // Ensure unit is set (for migration of existing data)
    if (!issp.unit && user.unit) {
      issp.unit = user.unit;
    }

    const previousSection = deepClone(issp.resourceRequirements || {});
    
    // Update the data
    if (pageA) issp.resourceRequirements.pageA = pageA;
    if (pageB) issp.resourceRequirements.pageB = { ...issp.resourceRequirements.pageB, ...pageB };
    if (pageC) issp.resourceRequirements.pageC = pageC;
    
    // Auto-update status
    issp.resourceRequirements.status = checkSectionCompletion(issp.resourceRequirements, 'resourceRequirements');
    
    await issp.save();

    const sectionKey = 'resourceRequirements';
    const isspId = issp._id.toString();
    await Promise.all([
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageA',
        previousValue: previousSection.pageA,
        currentValue: issp.resourceRequirements.pageA,
        patchValue: pageA
      }),
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageB',
        previousValue: previousSection.pageB,
        currentValue: issp.resourceRequirements.pageB,
        patchValue: pageB
      }),
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageC',
        previousValue: previousSection.pageC,
        currentValue: issp.resourceRequirements.pageC,
        patchValue: pageC
      })
    ]);
    
    res.json(issp);
  } catch (error) {
    console.error('Error updating resource requirements:', error);
    res.status(500).json({ message: 'Error updating resource requirements', error: error.message });
  }
});

// UPDATE Development and Investment Program
router.put('/development-investment-program', auth, async (req, res) => {
  try {
    const { pageA, pageB, pageC } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let issp = await getISSPForUser(user);
    
    // Ensure unit is set (for migration of existing data)
    if (!issp.unit && user.unit) {
      issp.unit = user.unit;
    }

    const previousSection = deepClone(issp.developmentInvestmentProgram || {});
    
    // Update the data
    if (pageA) issp.developmentInvestmentProgram.pageA = pageA;
    if (pageB) issp.developmentInvestmentProgram.pageB = pageB;
    if (pageC) issp.developmentInvestmentProgram.pageC = pageC;
    
    // Auto-update status
    issp.developmentInvestmentProgram.status = checkSectionCompletion(issp.developmentInvestmentProgram, 'developmentInvestmentProgram');
    
    await issp.save();

    const sectionKey = 'developmentInvestmentProgram';
    const isspId = issp._id.toString();
    await Promise.all([
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageA',
        previousValue: previousSection.pageA,
        currentValue: issp.developmentInvestmentProgram.pageA,
        patchValue: pageA
      }),
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageB',
        previousValue: previousSection.pageB,
        currentValue: issp.developmentInvestmentProgram.pageB,
        patchValue: pageB
      }),
      logIsspSectionActivity({
        req,
        isspId,
        sectionKey,
        pageKey: 'pageC',
        previousValue: previousSection.pageC,
        currentValue: issp.developmentInvestmentProgram.pageC,
        patchValue: pageC
      })
    ]);
    
    res.json(issp);
  } catch (error) {
    console.error('Error updating development and investment program:', error);
    res.status(500).json({ message: 'Error updating development and investment program', error: error.message });
  }
});

router.get('/generate', auth, async (req, res) => {
  try {
    const { userId: queryUserId, yearCycle } = req.query;
    const selectedYearCycle = yearCycle || '2024-2027';

    let targetUserId = req.user.id;

    if (queryUserId) {
      // Allow admin, president, or Executive roles to generate ISSP for other users
      if (!(req.user.role === 'admin' || req.user.role === 'president' || req.user.role === 'Executive')) {
        return res.status(403).json({ message: 'Not authorized to generate ISSP for another user' });
      }

      if (!mongoose.Types.ObjectId.isValid(queryUserId)) {
        return res.status(400).json({ message: 'Invalid user identifier' });
      }

      targetUserId = queryUserId;
    }

    const issp = await ISSP.findOne({ userId: targetUserId });

    if (!issp) {
      return res.status(404).json({ message: 'ISSP data not found' });
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    const downloadFileName = queryUserId
      ? `issp-report-${targetUserId}-${selectedYearCycle}.pdf`
      : `issp-report-${selectedYearCycle}.pdf`;

    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);

    doc.on('error', (error) => {
      console.error('Error streaming ISSP PDF:', error);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    doc.pipe(res);

    let headerInitialized = false;
    const addPageWithHeader = () => {
      if (headerInitialized) {
        doc.addPage();
        drawHeader(doc, { yearCycle: selectedYearCycle });
      } else {
        drawHeader(doc, { isFirstPage: true, yearCycle: selectedYearCycle });
        headerInitialized = true;
      }
      doc.moveDown(1);
    };

    const startPart = (title) => {
      addPageWithHeader();
      drawPartHeading(doc, title);
    };

    const startSection = (title) => {
      drawSectionTitle(doc, title);
    };

    const organizationalProfile = issp.organizationalProfile || {};
    const informationSystemsStrategy = issp.informationSystemsStrategy || {};
    const resourceRequirements = issp.resourceRequirements || {};
    const detailedProjects = issp.detailedIctProjects || {};
    const developmentProgram = issp.developmentInvestmentProgram || {};

    // Part I
    startPart('PART I. ORGANIZATIONAL PROFILE');
    const pageAOrg = organizationalProfile.pageA || {};
    startSection('A. DEPARTMENT/AGENCY VISION / MISSION STATEMENT');
    doc.font('Helvetica-Bold').fontSize(11).text('A.1. Mandate');
    doc.moveDown(0.2);
    addBulletItem(doc, 'Legal Basis', pageAOrg.mandate, { indent: 24 });
    addBulletItem(doc, 'Functions', pageAOrg.functions, { indent: 24 });

    doc.font('Helvetica-Bold').fontSize(11).text('A.2. Vision Statement');
    doc.moveDown(0.15);
    addItalicParagraph(doc, pageAOrg.visionStatement);

    doc.font('Helvetica-Bold').fontSize(11).text('A.3. Mission Statement');
    doc.moveDown(0.15);
    addItalicParagraph(doc, pageAOrg.missionStatement);

    doc.font('Helvetica-Bold').fontSize(11).text('A.4. Major Final Outputs');
    doc.moveDown(0.15);
    addItalicParagraph(doc, pageAOrg.majorFinalOutput);

    // Force subsequent sections of Part I onto a new page
    addPageWithHeader();
    drawPartHeading(doc, 'PART I. ORGANIZATIONAL PROFILE');

    const pageBOrg = organizationalProfile.pageB || {};
    startSection('B. DEPARTMENT/AGENCY PROFILE');
    drawSubsectionTitle(doc, 'B.1. Name of Designated IS Planner', { indent: 28, after: 0.3 });
    addIndentedKeyValueList(doc, [
      ['Plantilla Position', pageBOrg.plantillaPosition],
      ['Organizational Unit', pageBOrg.organizationalUnit],
      ['E-mail Address', pageBOrg.emailAddress],
      ['Contact Number/s', pageBOrg.contactNumbers]
    ], { indent: 46 });
    drawSubsectionTitle(doc, 'B.2. Current Annual ICT Budget', { indent: 28, after: 0.3 });
    addIndentedKeyValueList(doc, [
      ['Annual ICT Budget', pageBOrg.annualIctBudget],
      ['Other Sources of Funds', pageBOrg.otherFundSources]
    ], { indent: 46 });
    drawSubsectionTitle(doc, 'B.3. Organizational Structure', { indent: 28, after: 0.3 });
    addIndentedKeyValueList(doc, [
      ['Total No. of Employees', pageBOrg.totalEmployees],
      ['No. of Regional/Extension Offices (if any)', pageBOrg.regionalOffices],
      ['No. of Provincial Offices (if any)', pageBOrg.provincialOffices],
      ['No. of Other Offices (e.g. District, Field, etc.)', pageBOrg.otherOffices]
    ], { indent: 46 });

    addPageWithHeader();
    drawPartHeading(doc, 'PART I. ORGANIZATIONAL PROFILE');
    drawSectionTitle(doc, 'TABLE B-1 (FOR DEPARTMENT-WIDE ORGANIZATIONS ONLY)', { after: 0.6 });
    drawTableB1(doc, organizationalProfile.pageC?.tableData || []);

    addPageWithHeader();
    drawPartHeading(doc, 'PART I. ORGANIZATIONAL PROFILE');
    startSection('C. THE DEPARTMENT/AGENCY AND ITS ENVIRONMENT (FUNCTIONAL INTERFACE CHART)');
    const functionalInterfaceChartUrl = organizationalProfile.pageC?.functionalInterfaceChartUrl || '';
    if (!renderDataUrlImage(doc, functionalInterfaceChartUrl, { maxHeight: 260 })) {
      addParagraph(doc, functionalInterfaceChartUrl ? 'Functional interface chart uploaded (non-image file).' : 'No functional interface chart uploaded.');
    }

    addPageWithHeader();
    drawPartHeading(doc, 'PART I. ORGANIZATIONAL PROFILE');

    startSection('D. PRESENT ICT SITUATION (STRATEGIC CHALLENGES)');
    const pageDOrg = organizationalProfile.pageD || {};
    addParagraph(doc, pageDOrg.strategicChallenges || 'No strategic challenges entered.');

    addPageWithHeader();
    drawPartHeading(doc, 'PART I. ORGANIZATIONAL PROFILE');

    const pageEOrgData = parseStrategicConcerns(organizationalProfile.pageE?.strategicConcerns);
    startSection('E. STRATEGIC CONCERNS FOR ICT USE');
    
    // Check if we have array data (new format) or old object format
    const pageERows = Array.isArray(pageEOrgData) ? pageEOrgData : [];
    
    if (pageERows.length > 0) {
      const pageEColumns = [
        { key: 'majorFinalOutput', label: 'MAJOR FINAL OUTPUT/ ORGANIZATIONAL OUTCOME', widthRatio: 0.28 },
        { key: 'criticalSystems', label: 'CRITICAL MANAGEMENT/OPERATING/ BUSINESS SYSTEMS', widthRatio: 0.28 },
        { key: 'problems', label: 'PROBLEMS', widthRatio: 0.22 },
        { key: 'intendedUse', label: 'INTENDED USE OF ICT', widthRatio: 0.22 }
      ];
      drawTable(doc, pageEColumns, pageERows, { rowHeight: 48, headerBgColor: '#ffffff' });
    } else {
      // Legacy format or no data
      addParagraph(doc, 'No strategic concerns data provided.');
    }

    // Part II
    startPart('PART II. INFORMATION SYSTEMS STRATEGY');
    const pageAIS = informationSystemsStrategy.pageA || {};
    startSection('A. CONCEPTUAL FRAMEWORK FOR INFORMATION SYSTEMS (DIAGRAM OF IS INTERFACE)');
    if (!renderDataUrlImage(doc, pageAIS.diagramUrl, { maxHeight: 260 })) {
      addParagraph(doc, pageAIS.diagramUrl ? 'Diagram uploaded (non-image file).' : 'No diagram uploaded.');
    }

    // Ensure subsequent sections of Part II start on a new page
    addPageWithHeader();
    drawPartHeading(doc, 'PART II. INFORMATION SYSTEMS STRATEGY');

    const pageBIS = informationSystemsStrategy.pageB || {};
    startSection('B. DETAILED DESCRIPTION OF PROPOSED INFORMATION SYSTEMS');
    drawLabelValueTable(
      doc,
      [
        { label: 'NAME OF INFORMATION SYSTEM/ SUB-SYSTEM', value: pageBIS.name, rowHeight: 40 },
        { label: 'DESCRIPTION', value: pageBIS.description, rowHeight: 64 },
        { label: 'STATUS', value: pageBIS.status },
        { label: 'DEVELOPMENT STRATEGY', value: pageBIS.developmentStrategy },
        { label: 'COMPUTING SCHEME', value: pageBIS.computingScheme },
        {
          label: 'USERS',
          subRows: [
            { label: 'INTERNAL', value: pageBIS.usersInternal },
            { label: 'EXTERNAL', value: pageBIS.usersExternal }
          ]
        },
        { label: 'SYSTEM OWNER', value: pageBIS.systemOwner }
      ],
      { labelWidthRatio: 0.33, rowHeight: 32, subRowHeight: 28, subLabelWidthRatio: 0.28 }
    );

    const pageCIS = informationSystemsStrategy.pageC || {};
    addPageWithHeader();
    drawPartHeading(doc, 'PART II. INFORMATION SYSTEMS STRATEGY');
    startSection('C. DATABASES REQUIRED');
    drawLabelValueTable(
      doc,
      [
        { label: 'NAME OF DATABASE', value: pageCIS.databaseName, rowHeight: 40 },
        { label: 'GENERAL CONTENTS / DESCRIPTION', value: pageCIS.generalContents, rowHeight: 64 },
        { label: 'STATUS', value: pageCIS.status },
        { label: 'INFORMATION SYSTEMS SERVED', value: pageCIS.informationSystemsServed },
        { label: 'DATA ARCHIVING / STORAGE MEDIA', value: pageCIS.dataArchiving },
        {
          label: 'USERS',
          subRows: [
            { label: 'INTERNAL', value: pageCIS.usersInternal },
            { label: 'EXTERNAL', value: pageCIS.usersExternal }
          ]
        },
        { label: 'SYSTEM OWNER', value: pageCIS.owner }
      ],
      { labelWidthRatio: 0.33, rowHeight: 32, subRowHeight: 28, subLabelWidthRatio: 0.28 }
    );

    addPageWithHeader();
    drawPartHeading(doc, 'PART II. INFORMATION SYSTEMS STRATEGY');
    const pageDIS = informationSystemsStrategy.pageD || {};
    startSection('D. NETWORK LAYOUT');
    if (!renderDataUrlImage(doc, pageDIS.networkLayoutUrl, { maxHeight: 260 })) {
      addParagraph(doc, pageDIS.networkLayoutUrl ? 'Network layout uploaded (non-image file).' : 'No network layout uploaded.');
    }

    // Part III
    startPart('PART III. DETAILED DESCRIPTION OF ICT PROJECTS');
    const internalProject = detailedProjects.internal || {};
    startSection('A. INTERNAL ICT PROJECTS');
    drawNumberedProjectTable(
      doc,
      [
        {
          number: '1',
          label: 'NAME/TITLE',
          leftValue: internalProject.nameTitle,
          rightLabel: 'RANK:',
          rightValue: internalProject.rank,
          rowHeight: 48
        },
        {
          number: '2',
          label: 'OBJECTIVES',
          leftValue: internalProject.objectives,
          rowHeight: 96
        },
        {
          number: '3',
          label: 'DURATION',
          leftValue: internalProject.duration,
          rowHeight: 48
        },
        {
          number: '4',
          label: 'DELIVERABLES',
          leftValue: internalProject.deliverables,
          rowHeight: 96
        }
      ],
      { numberWidthRatio: 0.08, labelWidthRatio: 0.45, rowHeight: 48 }
    );

    const crossAgencyProject = detailedProjects.crossAgency || {};
    addPageWithHeader();
    drawPartHeading(doc, 'PART III. DETAILED DESCRIPTION OF ICT PROJECTS');
    startSection('B. CROSS-AGENCY ICT PROJECTS');
    drawNumberedProjectTable(
      doc,
      [
        {
          number: '1',
          label: 'NAME/TITLE',
          leftValue: crossAgencyProject.nameTitle,
          rowHeight: 40
        },
        {
          number: '2',
          label: 'OBJECTIVES',
          leftValue: crossAgencyProject.objectives,
          rowHeight: 72
        },
        {
          number: '3',
          label: 'DURATION',
          leftValue: crossAgencyProject.duration,
          rowHeight: 40
        },
        {
          number: '4',
          label: 'DELIVERABLES',
          leftValue: crossAgencyProject.deliverables,
          rowHeight: 72
        },
        {
          number: '5',
          label: 'LEAD AGENCY',
          leftValue: crossAgencyProject.leadAgency,
          rowHeight: 40
        },
        {
          number: '6',
          label: 'IMPLEMENTING AGENCIES',
          leftValue: crossAgencyProject.implementingAgencies,
          rowHeight: 60
        }
      ],
      { numberWidthRatio: 0.08, labelWidthRatio: 0.45, rowHeight: 40 }
    );

    addPageWithHeader();
    drawPartHeading(doc, 'PART III. DETAILED DESCRIPTION OF ICT PROJECTS');
    startSection('C. PERFORMANCE MEASUREMENT FRAMEWORK');
    const performanceEntries = Array.isArray(detailedProjects.performance?.frameworkData)
      ? detailedProjects.performance.frameworkData
      : [];
    drawPerformanceFrameworkTable(doc, performanceEntries, {
      rowHeights: [150, 150],
      headerHeight: 42
    });

    // Part IV
    startPart('PART IV. RESOURCE REQUIREMENTS');
    startSection('A. DEPLOYMENT OF ICT EQUIPMENT AND SERVICES');
    
    // Get deployment data - if empty, populate from submitted requests
    let deploymentData = resourceRequirements.pageA?.deploymentData || [];
    const hasDeploymentData = deploymentData.length > 0 && 
                              deploymentData.some(row => row.item && row.item.trim() !== '');
    
    // If no deployment data exists, populate from submitted requests
    if (!hasDeploymentData) {
      const unitRequests = await Request.find({
        status: { $in: ['submitted', 'approved', 'rejected', 'resubmitted'] },
        year: selectedYearCycle
      })
      .populate('userId', 'username email unit')
      .sort({ createdAt: -1 });
      
      const itemsFromRequests = [];
      unitRequests.forEach(request => {
        const unitName = request.userId?.unit || 'N/A';
        if (request.items && Array.isArray(request.items)) {
          request.items.forEach(item => {
            if (item.item && item.item.trim() !== '') {
              itemsFromRequests.push({
                item: item.item || '',
                office: unitName,
                year1: '',
                year2: '',
                year3: ''
              });
            }
          });
        }
      });
      
      if (itemsFromRequests.length > 0) {
        deploymentData = itemsFromRequests;
      }
    }
    
    drawDeploymentTable(doc, deploymentData);

    addPageWithHeader();
    drawPartHeading(doc, 'PART IV. RESOURCE REQUIREMENTS');
    startSection('B. ICT ORGANIZATIONAL STRUCTURE');
    drawSubsectionTitle(doc, 'B.1 EXISTING ICT ORGANIZATIONAL STRUCTURE', { indent: 18, after: 0.4 });
    const existingStructureAdded = renderDataUrlImage(doc, resourceRequirements.pageB?.existingStructureUrl, { maxHeight: 220 });
    if (!existingStructureAdded) {
      addParagraph(doc, resourceRequirements.pageB?.existingStructureUrl ? 'Existing structure diagram uploaded (non-image file).' : 'No existing structure diagram uploaded.');
    }
    doc.moveDown(0.3);
    drawSubsectionTitle(doc, 'B.2 PROPOSED ICT ORGANIZATIONAL STRUCTURE', { indent: 18, after: 0.4 });
    const proposedStructureAdded = renderDataUrlImage(doc, resourceRequirements.pageB?.proposedStructureUrl, { maxHeight: 220 });
    if (!proposedStructureAdded) {
      addParagraph(doc, resourceRequirements.pageB?.proposedStructureUrl ? 'Proposed structure diagram uploaded (non-image file).' : 'No proposed structure diagram uploaded.');
    }

    addPageWithHeader();
    drawPartHeading(doc, 'PART IV. RESOURCE REQUIREMENTS');
    startSection('B.3. PLACEMENT OF THE PROPOSED ICT ORGANIZATIONAL STRUCTURE IN THE AGENCY ORGANIZATIONAL CHART');
    if (!renderDataUrlImage(doc, resourceRequirements.pageC?.placementStructureUrl, { maxHeight: 220 })) {
      addParagraph(doc, resourceRequirements.pageC?.placementStructureUrl ? 'Placement structure diagram uploaded (non-image file).' : 'No placement structure diagram uploaded.');
    }

    // Part V
    startPart('PART V. DEVELOPMENT AND INVESTMENT PROGRAM');
    startSection('A. ICT PROJECTS IMPLEMENTATION SCHEDULE');
    const projectScheduleColumns = [
      { key: 'name', label: 'NAME OF ICT PROJECT/S', widthRatio: 0.40 },
      { key: 'year1', label: 'YEAR 1', widthRatio: 0.20 },
      { key: 'year2', label: 'YEAR 2', widthRatio: 0.20 },
      { key: 'year3', label: 'YEAR 3', widthRatio: 0.20 }
    ];
    drawTable(doc, projectScheduleColumns, developmentProgram.pageA?.projectSchedule || []);

    doc.moveDown(6.4);

    startSection('B. INFORMATION SYSTEMS (IS) IMPLEMENTATION SCHEDULE', { after: 1 });
    const isScheduleColumns = [
      { key: 'name', label: 'NAME OF INFORMATION SYSTEMS / SUB-SYSTEMS OR MODULES', widthRatio: 0.40 },
      { key: 'year1', label: 'YEAR 1', widthRatio: 0.20 },
      { key: 'year2', label: 'YEAR 2', widthRatio: 0.20 },
      { key: 'year3', label: 'YEAR 3', widthRatio: 0.20 }
    ];
    drawTable(doc, isScheduleColumns, developmentProgram.pageA?.isSchedule || []);

    addPageWithHeader();
    drawPartHeading(doc, 'PART V. DEVELOPMENT AND INVESTMENT PROGRAM');
    startSection('C. SUMMARY OF INVESTMENTS', { after: 0.6 });
    drawSummaryInvestmentsTable(doc, developmentProgram.pageB?.summaryInvestments || []);

    addPageWithHeader();
    drawPartHeading(doc, 'PART V. DEVELOPMENT AND INVESTMENT PROGRAM');
    startSection('D. YEAR 1 COST BREAKDOWN', { after: 0.8 });
    const costColumns = [
      { key: 'detailedItem', label: 'DETAILED COST ITEMS', widthRatio: 0.28 },
      { key: 'officeProductivity', label: 'OFFICE PRODUCTIVITY', widthRatio: 0.12 },
      { key: 'internalProject1', label: 'INTERNAL ICT PROJECT 1', widthRatio: 0.12 },
      { key: 'internalProject2', label: 'INTERNAL ICT PROJECT 2', widthRatio: 0.12 },
      { key: 'crossAgencyProject1', label: 'CROSS-AGENCY PROJECT 1', widthRatio: 0.12 },
      { key: 'crossAgencyProject2', label: 'CROSS-AGENCY PROJECT 2', widthRatio: 0.12 },
      { key: 'continuingCosts', label: 'CONTINUING COSTS', widthRatio: 0.12 }
    ];
    drawTable(doc, costColumns, developmentProgram.pageC?.costBreakdown || [], {
      headerBgColor: '#ffffff',
      rowHeight: 32
    });

    doc.end();
  } catch (error) {
    console.error('Error generating ISSP PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating ISSP PDF', error: error.message });
    }
  }
});

// Configure multer for DICT approved ISSP document uploads
const dictApprovedISSPStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/dict-approved-issp');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'dict-approved-issp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadDictApprovedISSP = multer({
  storage: dictApprovedISSPStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and image files (PDF, JPEG, PNG) are allowed'));
    }
  }
});

// Upload DICT National approved ISSP document
router.post('/upload-dict-approved', auth, uploadDictApprovedISSP.single('dictApprovedISSP'), async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can upload DICT approved ISSP documents' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Find or create ISSP document
    let issp = await getISSPForUser(user);
    
    // Ensure unit is set (for migration of existing data)
    if (!issp.unit && user.unit) {
      issp.unit = user.unit;
    }

    // Delete old DICT approved document if exists
    if (issp.dictApprovedISSPDocument) {
      try {
        const oldDocPath = path.join(__dirname, '..', issp.dictApprovedISSPDocument);
        if (fs.existsSync(oldDocPath)) {
          fs.unlinkSync(oldDocPath);
        }
      } catch (deleteError) {
        console.error('Error deleting old DICT approved ISSP document:', deleteError);
        // Continue even if old document deletion fails
      }
    }

    // Store relative path
    issp.dictApprovedISSPDocument = `uploads/dict-approved-issp/${req.file.filename}`;
    await issp.save();

    // Create notifications for all users (unit users and president)
    try {
      // Find all users except admin
      const allUsers = await User.find({ role: { $ne: 'admin' } });
      
      if (allUsers.length > 0) {
        const notifications = allUsers.map(unitUser => ({
          userId: unitUser._id,
          unit: unitUser.unit || null, // Store unit for department account access
          type: 'issp_approved',
          title: 'Approved ISSP Document Available',
          message: 'The approved ISSP document has been uploaded and is now available for viewing.',
          isspId: issp._id
        }));
        
        await Notification.insertMany(notifications);
      }
    } catch (error) {
      console.error('Error creating notifications for approved ISSP:', error);
      // Don't fail the upload if notification creation fails
    }

    // Log audit event
    await logAuditEvent({
      actor: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        unit: user.unit
      },
      action: 'dict_approved_issp_uploaded',
      description: 'Uploaded DICT National approved ISSP document',
      target: {
        type: 'issp',
        id: issp._id.toString(),
        name: 'DICT Approved ISSP Document'
      },
      metadata: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size
      }
    });

    res.json({
      message: 'DICT National approved ISSP document uploaded successfully',
      dictApprovedISSPDocument: issp.dictApprovedISSPDocument
    });
  } catch (error) {
    console.error('Error uploading DICT approved ISSP:', error);
    
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ message: `File upload error: ${error.message}` });
    }
    
    res.status(500).json({ message: error.message || 'Server error uploading DICT approved ISSP document' });
  }
});

// GET approved ISSP document (accessible to all authenticated users)
router.get('/approved-document', auth, async (req, res) => {
  try {
    // Find admin user's ISSP document which contains the approved document
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      return res.json({ 
        dictApprovedISSPDocument: null,
        dictApproval: null
      });
    }

    const issp = await ISSP.findOne({ userId: adminUser._id });
    if (!issp) {
      return res.json({ 
        dictApprovedISSPDocument: null,
        dictApproval: null
      });
    }

    res.json({
      dictApprovedISSPDocument: issp.dictApprovedISSPDocument || null,
      dictApproval: issp.dictApproval || null
    });
  } catch (error) {
    console.error('Error fetching approved ISSP document:', error);
    res.status(500).json({ message: 'Error fetching approved ISSP document', error: error.message });
  }
});

// PUT - Update DICT approval status for ISSP (Admin only)
router.put('/dict-approval/:isspId', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can update DICT approval status' });
    }

    const { isspId } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ['pending', 'approve_for_dict', 'collation_compilation', 'revision_from_dict', 'approved_by_dict'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid DICT approval status' });
    }

    if (!mongoose.Types.ObjectId.isValid(isspId)) {
      return res.status(400).json({ message: 'Invalid ISSP ID' });
    }

    const issp = await ISSP.findById(isspId);
    if (!issp) {
      return res.status(404).json({ message: 'ISSP not found' });
    }

    const oldStatus = issp.dictApproval?.status || 'pending';

    // Update DICT approval status
    if (!issp.dictApproval) {
      issp.dictApproval = {};
    }
    issp.dictApproval.status = status;
    issp.dictApproval.updatedAt = new Date();
    issp.dictApproval.updatedBy = req.user.id;
    issp.dictApproval.notes = notes || '';

    await issp.save();
    await issp.populate('userId', 'username email unit');
    await issp.populate('dictApproval.updatedBy', 'username email');

    // Create notifications for all units and president
    const statusLabels = {
      'pending': 'Pending',
      'approve_for_dict': 'Approve for DICT',
      'collation_compilation': 'Collation/Compilation',
      'revision_from_dict': 'Revision from DICT',
      'approved_by_dict': 'Approved by DICT'
    };

    const notificationMessage = `ISSP DICT approval status has been updated to: ${statusLabels[status]}.${notes ? ' Notes: ' + notes : ''}`;

    try {
      // Find all unit users (non-admin, non-president)
      const unitUsers = await User.find({ 
        role: { $nin: ['admin', 'president', 'Executive'] }
      });

      // Find president user
      const president = await User.findOne({ 
        $or: [
          { role: 'president' },
          { role: 'Executive' }
        ]
      });

      const notifications = [];

      // Notify all unit users
      unitUsers.forEach(unitUser => {
        notifications.push({
          userId: unitUser._id,
          unit: unitUser.unit || null, // Store unit for department account access
          type: 'dict_status_updated',
          title: 'DICT Approval Status Updated',
          message: notificationMessage,
          isspId: issp._id
        });
      });

      // Notify president
      if (president) {
        notifications.push({
          userId: president._id,
          unit: null, // President doesn't have a unit
          type: 'dict_status_updated',
          title: 'DICT Approval Status Updated',
          message: notificationMessage,
          isspId: issp._id
        });
      }

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (error) {
      console.error('Error creating notifications for DICT status update:', error);
      // Don't fail the request if notification creation fails
    }

    // Log audit event
    await logAuditEvent({
      actor: req.user,
      action: 'dict_approval_updated',
      description: `Updated ISSP DICT approval status from "${oldStatus}" to "${status}"`,
      target: { type: 'issp', id: issp._id.toString() },
      metadata: {
        oldStatus,
        newStatus: status,
        notes
      }
    });

    res.json({
      message: 'DICT approval status updated successfully',
      issp: issp
    });
  } catch (error) {
    console.error('Error updating DICT approval status:', error);
    res.status(500).json({ message: error.message || 'Failed to update DICT approval status' });
  }
});

// PUT - Update Accepting Entries status for ISSP (Admin only)
router.put('/accepting-entries/:isspId', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can update accepting entries status' });
    }

    const { isspId } = req.params;
    const { status, notes, yearCycle } = req.body;

    // Validate status
    const validStatuses = ['accepting', 'not_accepting'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid accepting entries status' });
    }

    // Validate yearCycle
    if (!yearCycle) {
      return res.status(400).json({ message: 'Year cycle is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(isspId)) {
      return res.status(400).json({ message: 'Invalid ISSP ID' });
    }

    const issp = await ISSP.findById(isspId);
    if (!issp) {
      return res.status(404).json({ message: 'ISSP not found' });
    }

    // Initialize acceptingEntries if it doesn't exist (Mongoose Map)
    if (!issp.acceptingEntries) {
      issp.acceptingEntries = {};
    }

    // Get old status for this year cycle (default to 'accepting')
    // Mongoose Maps can be accessed as objects
    const yearCycleEntry = issp.acceptingEntries[yearCycle] || 
                          (issp.acceptingEntries.get ? issp.acceptingEntries.get(yearCycle) : null);
    const oldStatus = yearCycleEntry?.status || 'accepting';

    // Update accepting entries status for this year cycle
    // Mongoose Maps can be set using bracket notation or .set() method
    if (issp.acceptingEntries.set) {
      // Use Map method if available
      issp.acceptingEntries.set(yearCycle, {
        status: status,
        updatedAt: new Date(),
        updatedBy: req.user.id,
        notes: notes || ''
      });
    } else {
      // Use object notation
      issp.acceptingEntries[yearCycle] = {
        status: status,
        updatedAt: new Date(),
        updatedBy: req.user.id,
        notes: notes || ''
      };
    }

    await issp.save();
    
    // Populate updatedBy for the specific year cycle entry
    const yearCycleEntryAfterSave = issp.acceptingEntries[yearCycle] || 
                                    (issp.acceptingEntries.get ? issp.acceptingEntries.get(yearCycle) : null);
    if (yearCycleEntryAfterSave && yearCycleEntryAfterSave.updatedBy) {
      await issp.populate({
        path: 'acceptingEntries.' + yearCycle + '.updatedBy',
        select: 'username email'
      });
    }

    // Create notifications for all units
    const statusLabels = {
      'accepting': 'Accepting Entries',
      'not_accepting': 'No Accepting Entries'
    };

    const notificationMessage = `ISSP entry status for ${yearCycle} has been updated: ${statusLabels[status]}.${notes ? ' Notes: ' + notes : ''}`;

    try {
      // Find all unit users (non-admin, non-president)
      const unitUsers = await User.find({ 
        role: { $nin: ['admin', 'president', 'Executive'] }
      });

      const notifications = unitUsers.map(unitUser => ({
        userId: unitUser._id,
        unit: unitUser.unit || null, // Store unit for department account access
        type: 'dict_status_updated',
        title: 'ISSP Entry Status Updated',
        message: notificationMessage,
        isspId: issp._id
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (error) {
      console.error('Error creating notifications for accepting entries update:', error);
      // Don't fail the request if notification creation fails
    }

    // Log audit event
    await logAuditEvent({
      actor: req.user,
      action: 'accepting_entries_updated',
      description: `Updated ISSP accepting entries status for ${yearCycle} from "${oldStatus}" to "${status}"`,
      target: { type: 'issp', id: issp._id.toString() },
      metadata: {
        yearCycle,
        oldStatus,
        newStatus: status,
        notes
      }
    });

    res.json({
      message: 'Accepting entries status updated successfully',
      issp: issp
    });
  } catch (error) {
    console.error('Error updating accepting entries status:', error);
    res.status(500).json({ message: error.message || 'Failed to update accepting entries status' });
  }
});

module.exports = router;

