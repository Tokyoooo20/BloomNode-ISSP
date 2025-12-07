const mongoose = require('mongoose');

const isspSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  unit: {
    type: String,
    required: false,
    trim: true,
    index: true // Index for efficient queries by unit
  },
  campus: {
    type: String,
    required: false,
    trim: true,
    default: '',
    index: true // Index for efficient queries by campus
  },
  // PART I: ORGANIZATIONAL PROFILE
  organizationalProfile: {
    pageA: {
      mandate: { type: String, default: '' },
      visionStatement: { type: String, default: '' },
      missionStatement: { type: String, default: '' },
      majorFinalOutput: { type: String, default: '' }
    },
    pageB: {
      plannerName: { type: String, default: '' },
      plantillaPosition: { type: String, default: '' },
      organizationalUnit: { type: String, default: '' },
      emailAddress: { type: String, default: '' },
      contactNumbers: { type: String, default: '' },
      annualIctBudget: { type: String, default: '' },
      otherFundSources: { type: String, default: '' },
      totalEmployees: { type: String, default: '' },
      regionalOffices: { type: String, default: '' },
      provincialOffices: { type: String, default: '' },
      otherOffices: { type: String, default: '' }
    },
    pageC: {
      tableData: { type: Array, default: [] },
      functionalInterfaceChartUrl: { type: String, default: '' }
    },
    pageD: {
      strategicChallenges: { type: String, default: '' }
    },
    pageE: {
      strategicConcerns: {
        type: [{
          _id: false,
          majorFinalOutput: { type: String, default: '' },
          criticalSystems: { type: String, default: '' },
          problems: { type: String, default: '' },
          intendedUse: { type: String, default: '' }
        }],
        default: []
      }
    },
    status: {
      type: String,
      enum: ['in_progress', 'complete'],
      default: 'in_progress'
    }
  },
  
  // PART II: INFORMATION SYSTEMS STRATEGY
  informationSystemsStrategy: {
    pageA: {
      diagramUrl: { type: String, default: '' }
    },
    pageB: {
      name: { type: String, default: '' },
      description: { type: String, default: '' },
      status: { type: String, default: '' },
      developmentStrategy: { type: String, default: '' },
      computingScheme: { type: String, default: '' },
      usersInternal: { type: String, default: '' },
      usersExternal: { type: String, default: '' },
      systemOwner: { type: String, default: '' }
    },
    pageC: {
      databaseName: { type: String, default: '' },
      generalContents: { type: String, default: '' },
      status: { type: String, default: '' },
      informationSystemsServed: { type: String, default: '' },
      dataArchiving: { type: String, default: '' },
      usersInternal: { type: String, default: '' },
      usersExternal: { type: String, default: '' },
      owner: { type: String, default: '' }
    },
    pageD: {
      networkLayoutUrl: { type: String, default: '' }
    },
    status: {
      type: String,
      enum: ['in_progress', 'complete'],
      default: 'in_progress'
    }
  },
  
  // PART III: DETAILED DESCRIPTION OF ICT PROJECTS
  detailedIctProjects: {
    internal: {
      nameTitle: { type: String, default: '' },
      rank: { type: String, default: '' },
      objectives: { type: String, default: '' },
      duration: { type: String, default: '' },
      deliverables: { type: String, default: '' }
    },
    crossAgency: {
      nameTitle: { type: String, default: '' },
      objectives: { type: String, default: '' },
      duration: { type: String, default: '' },
      deliverables: { type: String, default: '' },
      leadAgency: { type: String, default: '' },
      implementingAgencies: { type: String, default: '' }
    },
    performance: {
      frameworkData: { type: Array, default: [] }
    },
    status: {
      type: String,
      enum: ['in_progress', 'complete'],
      default: 'in_progress'
    }
  },
  
  // PART IV: RESOURCE REQUIREMENTS
  resourceRequirements: {
    pageA: {
      deploymentData: { type: Array, default: [] }
    },
    pageB: {
      existingStructureUrl: { type: String, default: '' },
      proposedStructureUrl: { type: String, default: '' }
    },
    pageC: {
      placementStructureUrl: { type: String, default: '' }
    },
    status: {
      type: String,
      enum: ['in_progress', 'complete'],
      default: 'in_progress'
    }
  },
  
  // PART V: DEVELOPMENT AND INVESTMENT PROGRAM
  developmentInvestmentProgram: {
    pageA: {
      projectSchedule: { type: Array, default: [] },
      isSchedule: { type: Array, default: [] }
    },
    pageB: {
      summaryInvestments: { type: Array, default: [] }
    },
    pageC: {
      costBreakdown: { type: Array, default: [] }
    },
    status: {
      type: String,
      enum: ['in_progress', 'complete'],
      default: 'in_progress'
    }
  },

  review: {
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'draft'
    },
    submittedAt: {
      type: Date,
      default: null
    },
    decidedAt: {
      type: Date,
      default: null
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    decisionNotes: {
      type: String,
      default: ''
    }
  },
  dictApprovedISSPDocument: {
    type: String,
    default: null
  },
  dictApproval: {
    type: Map,
    of: {
      status: {
        type: String,
        enum: ['pending', 'approve_for_dict', 'collation_compilation', 'revision_from_dict', 'approved_by_dict'],
        default: 'pending'
      },
      updatedAt: {
        type: Date,
        default: null
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      notes: {
        type: String,
        default: ''
      }
    },
    default: {}
  },
  acceptingEntries: {
    type: Map,
    of: {
      status: {
        type: String,
        enum: ['accepting', 'not_accepting'],
        default: 'accepting'
      },
      updatedAt: {
        type: Date,
        default: null
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      notes: {
        type: String,
        default: ''
      }
    },
    default: {}
  }
}, {
  timestamps: true
});

// Pre-save hook to populate unit from userId if not already set
isspSchema.pre('save', async function(next) {
  if (!this.unit && this.userId) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.userId);
      if (user && user.unit) {
        this.unit = user.unit;
      }
    } catch (error) {
      // If user not found or error, continue without setting unit
      console.warn('Could not populate unit for ISSP:', error.message);
    }
  }
  next();
});

module.exports = mongoose.model('ISSP', isspSchema);


