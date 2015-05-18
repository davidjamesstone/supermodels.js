(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var model = require('./model');
var fullAssessmentSchema = model.fullAssessmentSchema;
var FullAssessmentView = require('./view');


// now to make the call to superviews
// to initialize the bindings etc.
var FullAssessment = supermodels(fullAssessmentSchema);
var fullAssessment = new FullAssessment();

// Create a blank assessment
// a single applicant
fullAssessment.brokerRef = 'ABC001';
var joe = fullAssessment.applicants.addApplicant();
joe.firstName = 'Joe';
joe.lastName = 'Bloggs';

var joanne = fullAssessment.applicants.addApplicant();
joanne.firstName = 'Joanne';
joanne.lastName = 'Bloggs';

var unsecuredCreditItem = fullAssessment.unsecuredCredit.addUnsecuredCredit();
unsecuredCreditItem.applicantId = joe.id;
unsecuredCreditItem.creditor = 'Wonga';
unsecuredCreditItem.balance = 500;

var unsecuredCreditItem2 = fullAssessment.unsecuredCredit.addUnsecuredCredit();
unsecuredCreditItem2.applicantId = joanne.id;
unsecuredCreditItem2.creditor = 'Dial-a-loan';
unsecuredCreditItem2.balance = 1200;
unsecuredCreditItem2.monthlyRepayments = 50;

var unsecuredCreditItem3 = fullAssessment.unsecuredCredit.addUnsecuredCredit();
unsecuredCreditItem3.applicantId = joe.id;
unsecuredCreditItem3.creditor = 'Money People';
unsecuredCreditItem3.balance = 1600;

var initTab = window.location.hash ? window.location.hash.substr(1) : 0;
var fullAssessmentView = new FullAssessmentView(document.body, fullAssessment, {
  tab: initTab
});

// todo
fullAssessmentView.unsecuredCreditItemTypes = model.unsecuredCreditItemTypes;

// now to make the call to superviews
// to initialize the bindings etc.
fullAssessmentView.render();


// print JSON
var json = document.getElementById('json');

function renderJson() {
  json.innerHTML = JSON.stringify(fullAssessment, null, 2);
}
renderJson();
fullAssessment.on('change', renderJson);

//document.body.querySelector('.popover.errors').style.display = '';
fullAssessmentView.toggleErrors();

window.fullAssessmentView = fullAssessmentView;

},{"./model":2,"./view":3}],2:[function(require,module,exports){
var required = function(value, name) {
  if (!value) {
    return name + ' is required';
  }
};

function createExpenseSchema(name, description) {
  var expenseSchema = {
    name: name,
    value: {
      __type: Number,
      __validators: [function(value) {
        if (!value) {
          return name + ' is required';
        }
      }]
    },
    description: description
  };
  return expenseSchema;
}

function getTotalExpenses(expenses) {
  var keys = expenses.__keys,
    total = 0;
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key !== 'total' && expenses[key] && expenses[key].value) {
      total += expenses[key].value;
    }
  }
  return total;
}

function sum(arr, prop) {
  if (!arr || !arr.length) {
    return 0;
  }

  var total = 0;
  for (var i = 0; i < arr.length; i++) {
    total += arr[i][prop] || 0;
  }
  return total;
}

/**
 * Monthly Income
 */
var monthlyIncomeSchema = {
  occupation: {
    __type: String,
    __validators: [required]
  },
  natureOfBusiness: {
    __type: String,
    __validators: [required]
  },
  employedNetMonthlyIncome: {
    __type: Number,
    __validators: [required]
  },
  selfEmployedNetMonthlyIncome: {
    __type: Number,
    __validators: [required]
  },
  netRentalIncome: {
    __type: Number,
    __validators: [required]
  },
  statePension: {
    __type: Number,
    __validators: [required]
  },
  privatePension: {
    __type: Number,
    __validators: [required]
  },
  deptWorkPension: {
    __type: Number,
    __validators: [required]
  },
  workingFamilyTaxCredits: {
    __type: Number,
    __validators: [required]
  },
  taxCredit: {
    __type: Number,
    __validators: [required]
  },
  childBenefit: {
    __type: Number,
    __validators: [required]
  },
  otherIncome: {
    description: {
      __type: String,
      __validators: [function(value) {
        if (this.amount && !value) {
          return 'Other income description is required';
        }
        if (!this.amount && value) {
          return 'Other income description should be blank';
        }
      }]
    },
    amount: Number
  },
  get totalNetMonthlyIncome() {
    return [
      this.employedNetMonthlyIncome, this.selfEmployedNetMonthlyIncome, this.netRentalIncome,
      this.statePension, this.privatePension, this.deptWorkPension, this.workingFamilyTaxCredits,
      this.taxCredit, this.childBenefit, this.otherIncome.amount
    ].reduce(function(prev, curr) {
      return prev + (curr || 0);
    }, 0);
  }
};

/**
 * Applicant
 */
var applicantSchema = {
  id: Number,
  firstName: {
    __type: String,
    __validators: [required]
  },
  lastName: {
    __type: String,
    __validators: [required]
  },
  dob: {
    __type: Date,
    __validators: [required]
  },
  retirementAge: {
    __type: Number,
    __value: 65,
    __validators: [required]
  },
  get fullName() {
    if (this.firstName) {
      return this.firstName + ' ' + (this.lastName || '');
    }
    return '';
  },
  displayName: {
    __enumerable: false,
    __get: function() {
      if (this.fullName) {
        var displayName = this.fullName;
        if (this.age) {
          displayName += ', age ' + this.age;
        }
        if (this.numberOfYearsUntilRetirement) {
          displayName += ', retires in ' + this.numberOfYearsUntilRetirement + ' year(s)';
        }
        return displayName;
      }
      return '';
    }
  },
  get age() {
    if (this.dob) {
      return (new Date()).getFullYear() - this.dob.getFullYear();
    }
  },
  get numberOfYearsUntilRetirement() {
    if (this.retirementAge && this.age > 0) {
      return this.retirementAge - this.age;
    }
  },
  monthlyIncome: monthlyIncomeSchema
};

/**
 * Applicants
 */
var applicantsSchema = {
  items: [applicantSchema],
  get hasApplicants() {
    return !!this.items.length;
  },
  get canAddApplicant() {
    return this.items.length < 4;
  },
  addApplicant: function() {
    if (!this.canAddApplicant) {
      return;
    }

    var appl = this.items.create();
    appl.id = +Date.now();
    appl.firstName = '';
    appl.lastName = '';
    this.items.push(appl);
    return appl;
  },
  removeApplicant: function(applicant) {
    if (!this.hasApplicants) {
      return;
    }

    var idx = this.items.indexOf(applicant);

    if (idx !== -1) {

      // remove any items associated with this applicant
      var unsecuredCreditItems = this.__parent.unsecuredCredit.items;
      var i = unsecuredCreditItems.length;
      while (i--) {
        if (unsecuredCreditItems[i].applicantId === applicant.id) {
          unsecuredCreditItems.splice(i, 1);
        }
      }

      return this.items.splice(idx, 1);
    }
  },
  get totalNetMonthlyIncome() {
    return sum(this.items.map(function(item) {
      return item.monthlyIncome;
    }), 'totalNetMonthlyIncome');
  }
};

/**
 * Household Details
 */
var householdSchema = {
  numberOfDependants19OrOver: {
    __type: Number,
    __validators: [required]
  },
  numberOfDependants18OrUnder: {
    __type: Number,
    __validators: [required]
  },
  monthlyExpenditure: {
    essentials: {
      rentOrServiceChange: createExpenseSchema('Shared Ownership Rent / Ground Rent / Service Charge'),
      pensionLifeInsuranceMortgage: createExpenseSchema('Pension / Life Insurance / Mortgage Repayment Vehicle'),
      buildingsAndContentsInsurance: createExpenseSchema('Buildings & Contents Insurance'),
      councilTax: createExpenseSchema('Council Tax'),
      gasElectricHeating: createExpenseSchema('Gas, Electricity, Heating Fuels'),
      water: createExpenseSchema('Water'),
      shopping: createExpenseSchema('Shopping', '(food, toiletries, nappies, cleaning materials, cigarettes, tobacco, papers, lottery, alcohol, etc)'),
      medicalCare: createExpenseSchema('Costs for Medical / Care Assistance', '(TV licence, TV rental, sky/cable subscription, telephone landline, broadband, mobile telephones)'),
      get total() {
        return getTotalExpenses(this);
      }
    },
    livingExpenses: {
      tvInternetPhone: createExpenseSchema('TV, Internet, Sky/Cable, Telephone, Mobile'),
      entertainment: createExpenseSchema('Entertainment & Recreation', '(socialising, eating out, holidays, weekend trips, gym membership, etc)'),
      clothing: createExpenseSchema('Clothing'),
      childRelatedExpenses: createExpenseSchema('Child Related Expenses', '(child maintenance, child care / nursery / school fees, school meals, children\'s activities, etc)'),
      otherExpenses: createExpenseSchema('Other Expenses'),
      get total() {
        return getTotalExpenses(this);
      }
    },
    travelExpenses: {
      numberOfCars: {
        __type: Number,
        __value: 0
      },
      carExpenses: createExpenseSchema('Car Expenses', '(tax, fuel, insurance, MOT, etc for all cars)'),
      otherTravelExpenses: createExpenseSchema('Other Travel Expenses', '(rail, bus, taxi, tube, other)'),
      get total() {
        return getTotalExpenses(this);
      }
    },
    get total() {
      return this.essentials.total +
        this.livingExpenses.total +
        this.travelExpenses.total;
    }
  }
};

/**
 * Loan Details
 */
var loanDetailsSchema = {
  amount: {
    __type: Number,
    __validators: [required]
  },
  term: {
    __type: Number,
    __validators: [required]
  }
};

/**
 * Secured Credit
 */
var securedCreditItemSchema = {
  creditor: {
    __type: String,
    __validators: [required]
  },
  chargeType: {
    __type: Number,
    __validators: [required]
  },
  arrears: {
    __type: Number,
    __validators: [required]
  },
  balance: {
    __type: Number,
    __validators: [required]
  },
  monthlyRepayment: {
    __type: Number,
    __validators: [required]
  },
  toBeRepayed: {
    __type: Boolean
  }
};

var securedCreditSchema = {
  items: [securedCreditItemSchema],
  get itemsToBeRepayed() {
    return this.items.filter(function(item) {
      return item.toBeRepayed;
    });
  },
  get totalArrears() {
    return sum(this.items, 'arrears');
  },
  get totalBalance() {
    return sum(this.items, 'balance');
  },
  get totalMonthlyRepayment() {
    return sum(this.items, 'monthlyRepayment');
  },
  get totalArrearsToBeRepayed() {
    return sum(this.itemsToBeRepayed, 'arrears');
  },
  get totalBalanceToBeRepayed() {
    return sum(this.itemsToBeRepayed, 'balance');
  },
  get totalMonthlyRepaymentToBeRepayed() {
    return sum(this.itemsToBeRepayed, 'monthlyRepayment');
  },
  get totalArrearsRemaining() {
    return sum(this.itemsToBeRepayed, 'arrears');
  },
  get totalBalanceRemaining() {
    return sum(this.itemsToBeRepayed, 'balance');
  },
  get totalMonthlyRepaymentRemaining() {
    return sum(this.itemsToBeRepayed, 'monthlyRepayment');
  }
};

/**
 * Unsecured Credit
 */
var unsecuredCreditItemSubTypes = {
  Credit: 1,
  CCJ: 2,
  IVA: 3
};

var unsecuredCreditItemTypes = [{
  name: 'Credit Card',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Unsecured Loan',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Mail Order',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Store Card',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Hire Purchase',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Revolving Credit',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Bank Overdraft',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'Court Order',
  subType: unsecuredCreditItemSubTypes.Credit
}, {
  name: 'CCJ',
  subType: unsecuredCreditItemSubTypes.CCJ
}, {
  name: 'Default',
  subType: unsecuredCreditItemSubTypes.CCJ
}, {
  name: 'IVA',
  subType: unsecuredCreditItemSubTypes.IVA
}, {
  name: 'Bankruptcy',
  subType: unsecuredCreditItemSubTypes.IVA
}];

var unsecuredCreditItemSchema = {
  creditor: {
    __type: String,
    __validators: [required]
  },
  applicantId: {
    __type: Number,
    __validators: [required]
  },
  creditType: {
    __type: Number,
    __validators: [required]
  },
  balance: {
    __type: Number,
    __validators: [required]
  },
  monthlyRepayment: {
    __type: Number,
    __validators: [required]
  },
  toBeRepayed: {
    __type: Boolean
  }
};

var unsecuredCreditSchema = {
  items: [unsecuredCreditItemSchema],
  get ccjAndDefaults() {
    var creditType;
    return this.items.filter(function(item) {
      creditType = unsecuredCreditItemTypes[item.creditType];
      return creditType && creditType.subType === unsecuredCreditItemSubTypes.CCJ;
    });
  },
  get ivaAndBankruptcies() {
    var creditType;
    return this.items.filter(function(item) {
      creditType = unsecuredCreditItemTypes[item.creditType];
      return creditType && creditType.subType === unsecuredCreditItemSubTypes.IVA;
    });
  },
  get credits() {
    var creditType;
    return this.items.filter(function(item) {
      creditType = unsecuredCreditItemTypes[item.creditType];
      return creditType && creditType.subType === unsecuredCreditItemSubTypes.Credit;
    });
  },
  get itemsToBeRepayed() {
    return this.items.filter(function(item) {
      return item.toBeRepayed;
    });
  },
  get totalCCJAndDefaultsBalance() {
    return sum(this.ccjAndDefaults, 'balance');
  },
  get totalCCJAndDefaultsMonthlyRepayments() {
    return sum(this.ccjAndDefaults, 'monthlyRepayment');
  },
  get totalIVAAndBankruptciesBalance() {
    return sum(this.ivaAndBankruptcies, 'balance');
  },
  get totalIVAAndBankruptciesMonthlyRepayments() {
    return sum(this.ivaAndBankruptcies, 'monthlyRepayment');
  },
  get totalCreditBalance() {
    return sum(this.credits, 'balance');
  },
  get totalCreditMonthlyRepayments() {
    return sum(this.credits, 'monthlyRepayment');
  },
  get totalToBeRepayedBalance() {
    return sum(this.itemsToBeRepayed, 'balance');
  },
  get totalRemainingBalance() {
    return this.totalCCJAndDefaultsBalance + this.totalIVAAndBankruptciesBalance + this.totalCreditBalance - this.totalToBeRepayedBalance;
  },
  get totalRemainingMonthlyRepayments() {
    return this.totalCCJAndDefaultsMonthlyRepayments + this.totalIVAAndBankruptciesMonthlyRepayments + this.totalCreditMonthlyRepayments;
  },
  addUnsecuredCredit: function() {
    var newItem = this.items.create();
    newItem.balance = 0;
    newItem.monthlyRepayment = 0;
    this.items.push(newItem);
    return newItem;
  },
  removeUnsecuredCredit: function(unsecuredCreditItem) {
    var idx = this.items.indexOf(unsecuredCreditItem);

    if (idx !== -1) {
      return this.items.splice(idx, 1);
    }
  }
};


/**
 * Full Assessment
 */
var fullAssessmentSchema = {
  brokerRef: String,
  applicants: applicantsSchema,
  household: householdSchema,
  loanDetails: loanDetailsSchema,
  securedCredit: securedCreditSchema,
  unsecuredCredit: unsecuredCreditSchema
};

module.exports = {
  fullAssessmentSchema: fullAssessmentSchema,
  unsecuredCreditItemTypes: unsecuredCreditItemTypes
};

},{}],3:[function(require,module,exports){
function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this,
      args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * ApplicantsView Constructor function
 */
function ApplicantsView(el, parent) {
  var self = this;
  var applicants = parent.fullAssessment.applicants;

  this.el = el;
  this.applicants = applicants;
  this.editApplicant = applicants.items[0];

  function render() {
    superviews(el, parent);
  }

  var displayListEl = el.querySelectorAll('ol')[0];

  function renderDisplayList() {
    superviews(displayListEl, self);
  }

  var errorsEl = el.querySelectorAll('.errors')[0];

  function renderErrors() {
    superviews(errorsEl, self);
  }

  var totalEl = el.querySelectorAll('[ui-text="totalNetMonthlyIncome"]')[0];

  function renderTotal() {
    if (self.editApplicant) {
      superviews(totalEl, self.editApplicant.monthlyIncome);
    }
  }

  applicants.on('change', function() {
    renderDisplayList();
    renderErrors();
    renderTotal();
  });

  this.addApplicant = function(e) {
    var d = Date.now();
    e.preventDefault();
    applicants.addApplicant();
    this.setEditApplicant(applicants.items[applicants.items.length - 1]);
    console.log(Date.now() - d);
  };

  this.removeApplicant = function(e) {
    e.preventDefault();
    applicants.removeApplicant(this.editApplicant);
    this.setEditApplicant(applicants.items[0]);
  };

  this.setEditApplicant = function(applicant) {
    if (this.editApplicant === applicant) {
      return;
    }

    this.editApplicant = applicant;
    render();
  };

  // todo: don't like this
  // need bind / value formatters?
  Object.defineProperties(this, {
    dobUi: {
      get: function() {
        // Special Date Property that allow use to bind to an
        // <input type=Date>. This element requires date in YYYY-MM-DD
        var dob = this.editApplicant.dob;
        if (dob) {
          return moment(dob).format('YYYY-MM-DD');
        }
        return '';
      },
      set: function(value) {
        this.editApplicant.dob = value;
      }
    }
  });
}

/**
 * UnsecuredCredit View
 */
function UnsecuredCreditView(el, parent) {
  var self = this;
  var unsecuredCredit = parent.fullAssessment.unsecuredCredit;

  this.el = el;
  this.unsecuredCredit = unsecuredCredit;

  function render() {
    superviews(el, parent);
  }

  var errorsEl = el.querySelectorAll('.errors')[0];

  function renderErrors() {
    superviews(errorsEl, self);
  }

  var summaryEl = el.querySelectorAll('tfoot')[0];

  function renderSummary() {
    superviews(summaryEl, self);
  }

  unsecuredCredit.on('change', function() {
    renderErrors();
    renderSummary();
  });

  this.addUnsecuredCredit = function() {
    var d = Date.now();
    unsecuredCredit.addUnsecuredCredit();
    render();
    console.log(Date.now() - d);
  };

  this.removeUnsecuredCredit = function(item) {
    unsecuredCredit.removeUnsecuredCredit(item);
    render();
  };
}

/**
 * Views
 */
function FullAssessmentView(el, fullAssessment, options) {
  var self = this;

  this.el = el;
  this.fullAssessment = fullAssessment;

  /**
   * Tabs
   */
  this.tabs = [{
    name: 'Applicants',
    target: 'applicants'
  }, {
    name: 'Household',
    target: 'household'
  }, {
    name: 'Credit Commitments',
    target: 'credit'
  }];
  this.activeTab = this.tabs[options.tab || 0];
  this.setActiveTab = function(tab) {
    this.activeTab = tab;
    this.render();
  };

  this.getApplicantFullName = function(applicant) {
    return applicant.fullName || 'Applicant ' + (applicant.__parent.indexOf(applicant) + 1);
  };

  /**
   * Applicants Child View
   */
  var applicantsViewEl = el.querySelectorAll('[ui-with="applicantsView"]')[0];
  this.applicantsView = new ApplicantsView(applicantsViewEl, this);

  /**
   * Summary
   */
  var summaryEl = el.querySelectorAll('.summary')[0];
  fullAssessment.on('change', debounce(function(e) {
    var d = Date.now();
    superviews(summaryEl, self);
    console.log('render summary', Date.now() - d);
  }, 50));

  // Let's directly manipulate the DOM to toggleErrors for performace
  var errorsPopoverEl = summaryEl.querySelectorAll('.popover.errors')[0];
  this.toggleErrors = function() {
    var curr = errorsPopoverEl.style.display;
    errorsPopoverEl.style.display = (~['none', ''].indexOf(curr)) ? 'block' : 'none';
  };

  /**
   * Household
   */
  var householdViewEl = el.querySelectorAll('[ui-with="householdView"]')[0];
  fullAssessment.household.on('change', function(e) {
    superviews(householdViewEl, self);
  });

  /**
   * Unsecured Credit
   */
  var unsecuredCreditViewEl = el.querySelectorAll('[ui-with="unsecuredCreditView"]')[0];
  this.unsecuredCreditView = new UnsecuredCreditView(unsecuredCreditViewEl, this);


  this.render = function() {
    var d = Date.now();
    superviews(this.el, this);
    console.log('render main', Date.now() - d);
  };
}

module.exports = FullAssessmentView;

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJ0ZXN0L2V4YW1wbGVzL2FmZm9yZGFiaWxpdHktYXNzZXNzbWVudC9pbmRleC5qcyIsInRlc3QvZXhhbXBsZXMvYWZmb3JkYWJpbGl0eS1hc3Nlc3NtZW50L21vZGVsLmpzIiwidGVzdC9leGFtcGxlcy9hZmZvcmRhYmlsaXR5LWFzc2Vzc21lbnQvdmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBtb2RlbCA9IHJlcXVpcmUoJy4vbW9kZWwnKTtcbnZhciBmdWxsQXNzZXNzbWVudFNjaGVtYSA9IG1vZGVsLmZ1bGxBc3Nlc3NtZW50U2NoZW1hO1xudmFyIEZ1bGxBc3Nlc3NtZW50VmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xuXG5cbi8vIG5vdyB0byBtYWtlIHRoZSBjYWxsIHRvIHN1cGVydmlld3Ncbi8vIHRvIGluaXRpYWxpemUgdGhlIGJpbmRpbmdzIGV0Yy5cbnZhciBGdWxsQXNzZXNzbWVudCA9IHN1cGVybW9kZWxzKGZ1bGxBc3Nlc3NtZW50U2NoZW1hKTtcbnZhciBmdWxsQXNzZXNzbWVudCA9IG5ldyBGdWxsQXNzZXNzbWVudCgpO1xuXG4vLyBDcmVhdGUgYSBibGFuayBhc3Nlc3NtZW50XG4vLyBhIHNpbmdsZSBhcHBsaWNhbnRcbmZ1bGxBc3Nlc3NtZW50LmJyb2tlclJlZiA9ICdBQkMwMDEnO1xudmFyIGpvZSA9IGZ1bGxBc3Nlc3NtZW50LmFwcGxpY2FudHMuYWRkQXBwbGljYW50KCk7XG5qb2UuZmlyc3ROYW1lID0gJ0pvZSc7XG5qb2UubGFzdE5hbWUgPSAnQmxvZ2dzJztcblxudmFyIGpvYW5uZSA9IGZ1bGxBc3Nlc3NtZW50LmFwcGxpY2FudHMuYWRkQXBwbGljYW50KCk7XG5qb2FubmUuZmlyc3ROYW1lID0gJ0pvYW5uZSc7XG5qb2FubmUubGFzdE5hbWUgPSAnQmxvZ2dzJztcblxudmFyIHVuc2VjdXJlZENyZWRpdEl0ZW0gPSBmdWxsQXNzZXNzbWVudC51bnNlY3VyZWRDcmVkaXQuYWRkVW5zZWN1cmVkQ3JlZGl0KCk7XG51bnNlY3VyZWRDcmVkaXRJdGVtLmFwcGxpY2FudElkID0gam9lLmlkO1xudW5zZWN1cmVkQ3JlZGl0SXRlbS5jcmVkaXRvciA9ICdXb25nYSc7XG51bnNlY3VyZWRDcmVkaXRJdGVtLmJhbGFuY2UgPSA1MDA7XG5cbnZhciB1bnNlY3VyZWRDcmVkaXRJdGVtMiA9IGZ1bGxBc3Nlc3NtZW50LnVuc2VjdXJlZENyZWRpdC5hZGRVbnNlY3VyZWRDcmVkaXQoKTtcbnVuc2VjdXJlZENyZWRpdEl0ZW0yLmFwcGxpY2FudElkID0gam9hbm5lLmlkO1xudW5zZWN1cmVkQ3JlZGl0SXRlbTIuY3JlZGl0b3IgPSAnRGlhbC1hLWxvYW4nO1xudW5zZWN1cmVkQ3JlZGl0SXRlbTIuYmFsYW5jZSA9IDEyMDA7XG51bnNlY3VyZWRDcmVkaXRJdGVtMi5tb250aGx5UmVwYXltZW50cyA9IDUwO1xuXG52YXIgdW5zZWN1cmVkQ3JlZGl0SXRlbTMgPSBmdWxsQXNzZXNzbWVudC51bnNlY3VyZWRDcmVkaXQuYWRkVW5zZWN1cmVkQ3JlZGl0KCk7XG51bnNlY3VyZWRDcmVkaXRJdGVtMy5hcHBsaWNhbnRJZCA9IGpvZS5pZDtcbnVuc2VjdXJlZENyZWRpdEl0ZW0zLmNyZWRpdG9yID0gJ01vbmV5IFBlb3BsZSc7XG51bnNlY3VyZWRDcmVkaXRJdGVtMy5iYWxhbmNlID0gMTYwMDtcblxudmFyIGluaXRUYWIgPSB3aW5kb3cubG9jYXRpb24uaGFzaCA/IHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cigxKSA6IDA7XG52YXIgZnVsbEFzc2Vzc21lbnRWaWV3ID0gbmV3IEZ1bGxBc3Nlc3NtZW50Vmlldyhkb2N1bWVudC5ib2R5LCBmdWxsQXNzZXNzbWVudCwge1xuICB0YWI6IGluaXRUYWJcbn0pO1xuXG4vLyB0b2RvXG5mdWxsQXNzZXNzbWVudFZpZXcudW5zZWN1cmVkQ3JlZGl0SXRlbVR5cGVzID0gbW9kZWwudW5zZWN1cmVkQ3JlZGl0SXRlbVR5cGVzO1xuXG4vLyBub3cgdG8gbWFrZSB0aGUgY2FsbCB0byBzdXBlcnZpZXdzXG4vLyB0byBpbml0aWFsaXplIHRoZSBiaW5kaW5ncyBldGMuXG5mdWxsQXNzZXNzbWVudFZpZXcucmVuZGVyKCk7XG5cblxuLy8gcHJpbnQgSlNPTlxudmFyIGpzb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanNvbicpO1xuXG5mdW5jdGlvbiByZW5kZXJKc29uKCkge1xuICBqc29uLmlubmVySFRNTCA9IEpTT04uc3RyaW5naWZ5KGZ1bGxBc3Nlc3NtZW50LCBudWxsLCAyKTtcbn1cbnJlbmRlckpzb24oKTtcbmZ1bGxBc3Nlc3NtZW50Lm9uKCdjaGFuZ2UnLCByZW5kZXJKc29uKTtcblxuLy9kb2N1bWVudC5ib2R5LnF1ZXJ5U2VsZWN0b3IoJy5wb3BvdmVyLmVycm9ycycpLnN0eWxlLmRpc3BsYXkgPSAnJztcbmZ1bGxBc3Nlc3NtZW50Vmlldy50b2dnbGVFcnJvcnMoKTtcblxud2luZG93LmZ1bGxBc3Nlc3NtZW50VmlldyA9IGZ1bGxBc3Nlc3NtZW50VmlldztcbiIsInZhciByZXF1aXJlZCA9IGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gIGlmICghdmFsdWUpIHtcbiAgICByZXR1cm4gbmFtZSArICcgaXMgcmVxdWlyZWQnO1xuICB9XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVFeHBlbnNlU2NoZW1hKG5hbWUsIGRlc2NyaXB0aW9uKSB7XG4gIHZhciBleHBlbnNlU2NoZW1hID0ge1xuICAgIG5hbWU6IG5hbWUsXG4gICAgdmFsdWU6IHtcbiAgICAgIF9fdHlwZTogTnVtYmVyLFxuICAgICAgX192YWxpZGF0b3JzOiBbZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBuYW1lICsgJyBpcyByZXF1aXJlZCc7XG4gICAgICAgIH1cbiAgICAgIH1dXG4gICAgfSxcbiAgICBkZXNjcmlwdGlvbjogZGVzY3JpcHRpb25cbiAgfTtcbiAgcmV0dXJuIGV4cGVuc2VTY2hlbWE7XG59XG5cbmZ1bmN0aW9uIGdldFRvdGFsRXhwZW5zZXMoZXhwZW5zZXMpIHtcbiAgdmFyIGtleXMgPSBleHBlbnNlcy5fX2tleXMsXG4gICAgdG90YWwgPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICBpZiAoa2V5ICE9PSAndG90YWwnICYmIGV4cGVuc2VzW2tleV0gJiYgZXhwZW5zZXNba2V5XS52YWx1ZSkge1xuICAgICAgdG90YWwgKz0gZXhwZW5zZXNba2V5XS52YWx1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRvdGFsO1xufVxuXG5mdW5jdGlvbiBzdW0oYXJyLCBwcm9wKSB7XG4gIGlmICghYXJyIHx8ICFhcnIubGVuZ3RoKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICB2YXIgdG90YWwgPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgIHRvdGFsICs9IGFycltpXVtwcm9wXSB8fCAwO1xuICB9XG4gIHJldHVybiB0b3RhbDtcbn1cblxuLyoqXG4gKiBNb250aGx5IEluY29tZVxuICovXG52YXIgbW9udGhseUluY29tZVNjaGVtYSA9IHtcbiAgb2NjdXBhdGlvbjoge1xuICAgIF9fdHlwZTogU3RyaW5nLFxuICAgIF9fdmFsaWRhdG9yczogW3JlcXVpcmVkXVxuICB9LFxuICBuYXR1cmVPZkJ1c2luZXNzOiB7XG4gICAgX190eXBlOiBTdHJpbmcsXG4gICAgX192YWxpZGF0b3JzOiBbcmVxdWlyZWRdXG4gIH0sXG4gIGVtcGxveWVkTmV0TW9udGhseUluY29tZToge1xuICAgIF9fdHlwZTogTnVtYmVyLFxuICAgIF9fdmFsaWRhdG9yczogW3JlcXVpcmVkXVxuICB9LFxuICBzZWxmRW1wbG95ZWROZXRNb250aGx5SW5jb21lOiB7XG4gICAgX190eXBlOiBOdW1iZXIsXG4gICAgX192YWxpZGF0b3JzOiBbcmVxdWlyZWRdXG4gIH0sXG4gIG5ldFJlbnRhbEluY29tZToge1xuICAgIF9fdHlwZTogTnVtYmVyLFxuICAgIF9fdmFsaWRhdG9yczogW3JlcXVpcmVkXVxuICB9LFxuICBzdGF0ZVBlbnNpb246IHtcbiAgICBfX3R5cGU6IE51bWJlcixcbiAgICBfX3ZhbGlkYXRvcnM6IFtyZXF1aXJlZF1cbiAgfSxcbiAgcHJpdmF0ZVBlbnNpb246IHtcbiAgICBfX3R5cGU6IE51bWJlcixcbiAgICBfX3ZhbGlkYXRvcnM6IFtyZXF1aXJlZF1cbiAgfSxcbiAgZGVwdFdvcmtQZW5zaW9uOiB7XG4gICAgX190eXBlOiBOdW1iZXIsXG4gICAgX192YWxpZGF0b3JzOiBbcmVxdWlyZWRdXG4gIH0sXG4gIHdvcmtpbmdGYW1pbHlUYXhDcmVkaXRzOiB7XG4gICAgX190eXBlOiBOdW1iZXIsXG4gICAgX192YWxpZGF0b3JzOiBbcmVxdWlyZWRdXG4gIH0sXG4gIHRheENyZWRpdDoge1xuICAgIF9fdHlwZTogTnVtYmVyLFxuICAgIF9fdmFsaWRhdG9yczogW3JlcXVpcmVkXVxuICB9LFxuICBjaGlsZEJlbmVmaXQ6IHtcbiAgICBfX3R5cGU6IE51bWJlcixcbiAgICBfX3ZhbGlkYXRvcnM6IFtyZXF1aXJlZF1cbiAgfSxcbiAgb3RoZXJJbmNvbWU6IHtcbiAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgX190eXBlOiBTdHJpbmcsXG4gICAgICBfX3ZhbGlkYXRvcnM6IFtmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBpZiAodGhpcy5hbW91bnQgJiYgIXZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuICdPdGhlciBpbmNvbWUgZGVzY3JpcHRpb24gaXMgcmVxdWlyZWQnO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5hbW91bnQgJiYgdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gJ090aGVyIGluY29tZSBkZXNjcmlwdGlvbiBzaG91bGQgYmUgYmxhbmsnO1xuICAgICAgICB9XG4gICAgICB9XVxuICAgIH0sXG4gICAgYW1vdW50OiBOdW1iZXJcbiAgfSxcbiAgZ2V0IHRvdGFsTmV0TW9udGhseUluY29tZSgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgdGhpcy5lbXBsb3llZE5ldE1vbnRobHlJbmNvbWUsIHRoaXMuc2VsZkVtcGxveWVkTmV0TW9udGhseUluY29tZSwgdGhpcy5uZXRSZW50YWxJbmNvbWUsXG4gICAgICB0aGlzLnN0YXRlUGVuc2lvbiwgdGhpcy5wcml2YXRlUGVuc2lvbiwgdGhpcy5kZXB0V29ya1BlbnNpb24sIHRoaXMud29ya2luZ0ZhbWlseVRheENyZWRpdHMsXG4gICAgICB0aGlzLnRheENyZWRpdCwgdGhpcy5jaGlsZEJlbmVmaXQsIHRoaXMub3RoZXJJbmNvbWUuYW1vdW50XG4gICAgXS5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3Vycikge1xuICAgICAgcmV0dXJuIHByZXYgKyAoY3VyciB8fCAwKTtcbiAgICB9LCAwKTtcbiAgfVxufTtcblxuLyoqXG4gKiBBcHBsaWNhbnRcbiAqL1xudmFyIGFwcGxpY2FudFNjaGVtYSA9IHtcbiAgaWQ6IE51bWJlcixcbiAgZmlyc3ROYW1lOiB7XG4gICAgX190eXBlOiBTdHJpbmcsXG4gICAgX192YWxpZGF0b3JzOiBbcmVxdWlyZWRdXG4gIH0sXG4gIGxhc3ROYW1lOiB7XG4gICAgX190eXBlOiBTdHJpbmcsXG4gICAgX192YWxpZGF0b3JzOiBbcmVxdWlyZWRdXG4gIH0sXG4gIGRvYjoge1xuICAgIF9fdHlwZTogRGF0ZSxcbiAgICBfX3ZhbGlkYXRvcnM6IFtyZXF1aXJlZF1cbiAgfSxcbiAgcmV0aXJlbWVudEFnZToge1xuICAgIF9fdHlwZTogTnVtYmVyLFxuICAgIF9fdmFsdWU6IDY1LFxuICAgIF9fdmFsaWRhdG9yczogW3JlcXVpcmVkXVxuICB9LFxuICBnZXQgZnVsbE5hbWUoKSB7XG4gICAgaWYgKHRoaXMuZmlyc3ROYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5maXJzdE5hbWUgKyAnICcgKyAodGhpcy5sYXN0TmFtZSB8fCAnJyk7XG4gICAgfVxuICAgIHJldHVybiAnJztcbiAgfSxcbiAgZGlzcGxheU5hbWU6IHtcbiAgICBfX2VudW1lcmFibGU6IGZhbHNlLFxuICAgIF9fZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmZ1bGxOYW1lKSB7XG4gICAgICAgIHZhciBkaXNwbGF5TmFtZSA9IHRoaXMuZnVsbE5hbWU7XG4gICAgICAgIGlmICh0aGlzLmFnZSkge1xuICAgICAgICAgIGRpc3BsYXlOYW1lICs9ICcsIGFnZSAnICsgdGhpcy5hZ2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubnVtYmVyT2ZZZWFyc1VudGlsUmV0aXJlbWVudCkge1xuICAgICAgICAgIGRpc3BsYXlOYW1lICs9ICcsIHJldGlyZXMgaW4gJyArIHRoaXMubnVtYmVyT2ZZZWFyc1VudGlsUmV0aXJlbWVudCArICcgeWVhcihzKSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpc3BsYXlOYW1lO1xuICAgICAgfVxuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgfSxcbiAgZ2V0IGFnZSgpIHtcbiAgICBpZiAodGhpcy5kb2IpIHtcbiAgICAgIHJldHVybiAobmV3IERhdGUoKSkuZ2V0RnVsbFllYXIoKSAtIHRoaXMuZG9iLmdldEZ1bGxZZWFyKCk7XG4gICAgfVxuICB9LFxuICBnZXQgbnVtYmVyT2ZZZWFyc1VudGlsUmV0aXJlbWVudCgpIHtcbiAgICBpZiAodGhpcy5yZXRpcmVtZW50QWdlICYmIHRoaXMuYWdlID4gMCkge1xuICAgICAgcmV0dXJuIHRoaXMucmV0aXJlbWVudEFnZSAtIHRoaXMuYWdlO1xuICAgIH1cbiAgfSxcbiAgbW9udGhseUluY29tZTogbW9udGhseUluY29tZVNjaGVtYVxufTtcblxuLyoqXG4gKiBBcHBsaWNhbnRzXG4gKi9cbnZhciBhcHBsaWNhbnRzU2NoZW1hID0ge1xuICBpdGVtczogW2FwcGxpY2FudFNjaGVtYV0sXG4gIGdldCBoYXNBcHBsaWNhbnRzKCkge1xuICAgIHJldHVybiAhIXRoaXMuaXRlbXMubGVuZ3RoO1xuICB9LFxuICBnZXQgY2FuQWRkQXBwbGljYW50KCkge1xuICAgIHJldHVybiB0aGlzLml0ZW1zLmxlbmd0aCA8IDQ7XG4gIH0sXG4gIGFkZEFwcGxpY2FudDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmNhbkFkZEFwcGxpY2FudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBhcHBsID0gdGhpcy5pdGVtcy5jcmVhdGUoKTtcbiAgICBhcHBsLmlkID0gK0RhdGUubm93KCk7XG4gICAgYXBwbC5maXJzdE5hbWUgPSAnJztcbiAgICBhcHBsLmxhc3ROYW1lID0gJyc7XG4gICAgdGhpcy5pdGVtcy5wdXNoKGFwcGwpO1xuICAgIHJldHVybiBhcHBsO1xuICB9LFxuICByZW1vdmVBcHBsaWNhbnQ6IGZ1bmN0aW9uKGFwcGxpY2FudCkge1xuICAgIGlmICghdGhpcy5oYXNBcHBsaWNhbnRzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGlkeCA9IHRoaXMuaXRlbXMuaW5kZXhPZihhcHBsaWNhbnQpO1xuXG4gICAgaWYgKGlkeCAhPT0gLTEpIHtcblxuICAgICAgLy8gcmVtb3ZlIGFueSBpdGVtcyBhc3NvY2lhdGVkIHdpdGggdGhpcyBhcHBsaWNhbnRcbiAgICAgIHZhciB1bnNlY3VyZWRDcmVkaXRJdGVtcyA9IHRoaXMuX19wYXJlbnQudW5zZWN1cmVkQ3JlZGl0Lml0ZW1zO1xuICAgICAgdmFyIGkgPSB1bnNlY3VyZWRDcmVkaXRJdGVtcy5sZW5ndGg7XG4gICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGlmICh1bnNlY3VyZWRDcmVkaXRJdGVtc1tpXS5hcHBsaWNhbnRJZCA9PT0gYXBwbGljYW50LmlkKSB7XG4gICAgICAgICAgdW5zZWN1cmVkQ3JlZGl0SXRlbXMuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLml0ZW1zLnNwbGljZShpZHgsIDEpO1xuICAgIH1cbiAgfSxcbiAgZ2V0IHRvdGFsTmV0TW9udGhseUluY29tZSgpIHtcbiAgICByZXR1cm4gc3VtKHRoaXMuaXRlbXMubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHJldHVybiBpdGVtLm1vbnRobHlJbmNvbWU7XG4gICAgfSksICd0b3RhbE5ldE1vbnRobHlJbmNvbWUnKTtcbiAgfVxufTtcblxuLyoqXG4gKiBIb3VzZWhvbGQgRGV0YWlsc1xuICovXG52YXIgaG91c2Vob2xkU2NoZW1hID0ge1xuICBudW1iZXJPZkRlcGVuZGFudHMxOU9yT3Zlcjoge1xuICAgIF9fdHlwZTogTnVtYmVyLFxuICAgIF9fdmFsaWRhdG9yczogW3JlcXVpcmVkXVxuICB9LFxuICBudW1iZXJPZkRlcGVuZGFudHMxOE9yVW5kZXI6IHtcbiAgICBfX3R5cGU6IE51bWJlcixcbiAgICBfX3ZhbGlkYXRvcnM6IFtyZXF1aXJlZF1cbiAgfSxcbiAgbW9udGhseUV4cGVuZGl0dXJlOiB7XG4gICAgZXNzZW50aWFsczoge1xuICAgICAgcmVudE9yU2VydmljZUNoYW5nZTogY3JlYXRlRXhwZW5zZVNjaGVtYSgnU2hhcmVkIE93bmVyc2hpcCBSZW50IC8gR3JvdW5kIFJlbnQgLyBTZXJ2aWNlIENoYXJnZScpLFxuICAgICAgcGVuc2lvbkxpZmVJbnN1cmFuY2VNb3J0Z2FnZTogY3JlYXRlRXhwZW5zZVNjaGVtYSgnUGVuc2lvbiAvIExpZmUgSW5zdXJhbmNlIC8gTW9ydGdhZ2UgUmVwYXltZW50IFZlaGljbGUnKSxcbiAgICAgIGJ1aWxkaW5nc0FuZENvbnRlbnRzSW5zdXJhbmNlOiBjcmVhdGVFeHBlbnNlU2NoZW1hKCdCdWlsZGluZ3MgJiBDb250ZW50cyBJbnN1cmFuY2UnKSxcbiAgICAgIGNvdW5jaWxUYXg6IGNyZWF0ZUV4cGVuc2VTY2hlbWEoJ0NvdW5jaWwgVGF4JyksXG4gICAgICBnYXNFbGVjdHJpY0hlYXRpbmc6IGNyZWF0ZUV4cGVuc2VTY2hlbWEoJ0dhcywgRWxlY3RyaWNpdHksIEhlYXRpbmcgRnVlbHMnKSxcbiAgICAgIHdhdGVyOiBjcmVhdGVFeHBlbnNlU2NoZW1hKCdXYXRlcicpLFxuICAgICAgc2hvcHBpbmc6IGNyZWF0ZUV4cGVuc2VTY2hlbWEoJ1Nob3BwaW5nJywgJyhmb29kLCB0b2lsZXRyaWVzLCBuYXBwaWVzLCBjbGVhbmluZyBtYXRlcmlhbHMsIGNpZ2FyZXR0ZXMsIHRvYmFjY28sIHBhcGVycywgbG90dGVyeSwgYWxjb2hvbCwgZXRjKScpLFxuICAgICAgbWVkaWNhbENhcmU6IGNyZWF0ZUV4cGVuc2VTY2hlbWEoJ0Nvc3RzIGZvciBNZWRpY2FsIC8gQ2FyZSBBc3Npc3RhbmNlJywgJyhUViBsaWNlbmNlLCBUViByZW50YWwsIHNreS9jYWJsZSBzdWJzY3JpcHRpb24sIHRlbGVwaG9uZSBsYW5kbGluZSwgYnJvYWRiYW5kLCBtb2JpbGUgdGVsZXBob25lcyknKSxcbiAgICAgIGdldCB0b3RhbCgpIHtcbiAgICAgICAgcmV0dXJuIGdldFRvdGFsRXhwZW5zZXModGhpcyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBsaXZpbmdFeHBlbnNlczoge1xuICAgICAgdHZJbnRlcm5ldFBob25lOiBjcmVhdGVFeHBlbnNlU2NoZW1hKCdUViwgSW50ZXJuZXQsIFNreS9DYWJsZSwgVGVsZXBob25lLCBNb2JpbGUnKSxcbiAgICAgIGVudGVydGFpbm1lbnQ6IGNyZWF0ZUV4cGVuc2VTY2hlbWEoJ0VudGVydGFpbm1lbnQgJiBSZWNyZWF0aW9uJywgJyhzb2NpYWxpc2luZywgZWF0aW5nIG91dCwgaG9saWRheXMsIHdlZWtlbmQgdHJpcHMsIGd5bSBtZW1iZXJzaGlwLCBldGMpJyksXG4gICAgICBjbG90aGluZzogY3JlYXRlRXhwZW5zZVNjaGVtYSgnQ2xvdGhpbmcnKSxcbiAgICAgIGNoaWxkUmVsYXRlZEV4cGVuc2VzOiBjcmVhdGVFeHBlbnNlU2NoZW1hKCdDaGlsZCBSZWxhdGVkIEV4cGVuc2VzJywgJyhjaGlsZCBtYWludGVuYW5jZSwgY2hpbGQgY2FyZSAvIG51cnNlcnkgLyBzY2hvb2wgZmVlcywgc2Nob29sIG1lYWxzLCBjaGlsZHJlblxcJ3MgYWN0aXZpdGllcywgZXRjKScpLFxuICAgICAgb3RoZXJFeHBlbnNlczogY3JlYXRlRXhwZW5zZVNjaGVtYSgnT3RoZXIgRXhwZW5zZXMnKSxcbiAgICAgIGdldCB0b3RhbCgpIHtcbiAgICAgICAgcmV0dXJuIGdldFRvdGFsRXhwZW5zZXModGhpcyk7XG4gICAgICB9XG4gICAgfSxcbiAgICB0cmF2ZWxFeHBlbnNlczoge1xuICAgICAgbnVtYmVyT2ZDYXJzOiB7XG4gICAgICAgIF9fdHlwZTogTnVtYmVyLFxuICAgICAgICBfX3ZhbHVlOiAwXG4gICAgICB9LFxuICAgICAgY2FyRXhwZW5zZXM6IGNyZWF0ZUV4cGVuc2VTY2hlbWEoJ0NhciBFeHBlbnNlcycsICcodGF4LCBmdWVsLCBpbnN1cmFuY2UsIE1PVCwgZXRjIGZvciBhbGwgY2FycyknKSxcbiAgICAgIG90aGVyVHJhdmVsRXhwZW5zZXM6IGNyZWF0ZUV4cGVuc2VTY2hlbWEoJ090aGVyIFRyYXZlbCBFeHBlbnNlcycsICcocmFpbCwgYnVzLCB0YXhpLCB0dWJlLCBvdGhlciknKSxcbiAgICAgIGdldCB0b3RhbCgpIHtcbiAgICAgICAgcmV0dXJuIGdldFRvdGFsRXhwZW5zZXModGhpcyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBnZXQgdG90YWwoKSB7XG4gICAgICByZXR1cm4gdGhpcy5lc3NlbnRpYWxzLnRvdGFsICtcbiAgICAgICAgdGhpcy5saXZpbmdFeHBlbnNlcy50b3RhbCArXG4gICAgICAgIHRoaXMudHJhdmVsRXhwZW5zZXMudG90YWw7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIExvYW4gRGV0YWlsc1xuICovXG52YXIgbG9hbkRldGFpbHNTY2hlbWEgPSB7XG4gIGFtb3VudDoge1xuICAgIF9fdHlwZTogTnVtYmVyLFxuICAgIF9fdmFsaWRhdG9yczogW3JlcXVpcmVkXVxuICB9LFxuICB0ZXJtOiB7XG4gICAgX190eXBlOiBOdW1iZXIsXG4gICAgX192YWxpZGF0b3JzOiBbcmVxdWlyZWRdXG4gIH1cbn07XG5cbi8qKlxuICogU2VjdXJlZCBDcmVkaXRcbiAqL1xudmFyIHNlY3VyZWRDcmVkaXRJdGVtU2NoZW1hID0ge1xuICBjcmVkaXRvcjoge1xuICAgIF9fdHlwZTogU3RyaW5nLFxuICAgIF9fdmFsaWRhdG9yczogW3JlcXVpcmVkXVxuICB9LFxuICBjaGFyZ2VUeXBlOiB7XG4gICAgX190eXBlOiBOdW1iZXIsXG4gICAgX192YWxpZGF0b3JzOiBbcmVxdWlyZWRdXG4gIH0sXG4gIGFycmVhcnM6IHtcbiAgICBfX3R5cGU6IE51bWJlcixcbiAgICBfX3ZhbGlkYXRvcnM6IFtyZXF1aXJlZF1cbiAgfSxcbiAgYmFsYW5jZToge1xuICAgIF9fdHlwZTogTnVtYmVyLFxuICAgIF9fdmFsaWRhdG9yczogW3JlcXVpcmVkXVxuICB9LFxuICBtb250aGx5UmVwYXltZW50OiB7XG4gICAgX190eXBlOiBOdW1iZXIsXG4gICAgX192YWxpZGF0b3JzOiBbcmVxdWlyZWRdXG4gIH0sXG4gIHRvQmVSZXBheWVkOiB7XG4gICAgX190eXBlOiBCb29sZWFuXG4gIH1cbn07XG5cbnZhciBzZWN1cmVkQ3JlZGl0U2NoZW1hID0ge1xuICBpdGVtczogW3NlY3VyZWRDcmVkaXRJdGVtU2NoZW1hXSxcbiAgZ2V0IGl0ZW1zVG9CZVJlcGF5ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXRlbXMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHJldHVybiBpdGVtLnRvQmVSZXBheWVkO1xuICAgIH0pO1xuICB9LFxuICBnZXQgdG90YWxBcnJlYXJzKCkge1xuICAgIHJldHVybiBzdW0odGhpcy5pdGVtcywgJ2FycmVhcnMnKTtcbiAgfSxcbiAgZ2V0IHRvdGFsQmFsYW5jZSgpIHtcbiAgICByZXR1cm4gc3VtKHRoaXMuaXRlbXMsICdiYWxhbmNlJyk7XG4gIH0sXG4gIGdldCB0b3RhbE1vbnRobHlSZXBheW1lbnQoKSB7XG4gICAgcmV0dXJuIHN1bSh0aGlzLml0ZW1zLCAnbW9udGhseVJlcGF5bWVudCcpO1xuICB9LFxuICBnZXQgdG90YWxBcnJlYXJzVG9CZVJlcGF5ZWQoKSB7XG4gICAgcmV0dXJuIHN1bSh0aGlzLml0ZW1zVG9CZVJlcGF5ZWQsICdhcnJlYXJzJyk7XG4gIH0sXG4gIGdldCB0b3RhbEJhbGFuY2VUb0JlUmVwYXllZCgpIHtcbiAgICByZXR1cm4gc3VtKHRoaXMuaXRlbXNUb0JlUmVwYXllZCwgJ2JhbGFuY2UnKTtcbiAgfSxcbiAgZ2V0IHRvdGFsTW9udGhseVJlcGF5bWVudFRvQmVSZXBheWVkKCkge1xuICAgIHJldHVybiBzdW0odGhpcy5pdGVtc1RvQmVSZXBheWVkLCAnbW9udGhseVJlcGF5bWVudCcpO1xuICB9LFxuICBnZXQgdG90YWxBcnJlYXJzUmVtYWluaW5nKCkge1xuICAgIHJldHVybiBzdW0odGhpcy5pdGVtc1RvQmVSZXBheWVkLCAnYXJyZWFycycpO1xuICB9LFxuICBnZXQgdG90YWxCYWxhbmNlUmVtYWluaW5nKCkge1xuICAgIHJldHVybiBzdW0odGhpcy5pdGVtc1RvQmVSZXBheWVkLCAnYmFsYW5jZScpO1xuICB9LFxuICBnZXQgdG90YWxNb250aGx5UmVwYXltZW50UmVtYWluaW5nKCkge1xuICAgIHJldHVybiBzdW0odGhpcy5pdGVtc1RvQmVSZXBheWVkLCAnbW9udGhseVJlcGF5bWVudCcpO1xuICB9XG59O1xuXG4vKipcbiAqIFVuc2VjdXJlZCBDcmVkaXRcbiAqL1xudmFyIHVuc2VjdXJlZENyZWRpdEl0ZW1TdWJUeXBlcyA9IHtcbiAgQ3JlZGl0OiAxLFxuICBDQ0o6IDIsXG4gIElWQTogM1xufTtcblxudmFyIHVuc2VjdXJlZENyZWRpdEl0ZW1UeXBlcyA9IFt7XG4gIG5hbWU6ICdDcmVkaXQgQ2FyZCcsXG4gIHN1YlR5cGU6IHVuc2VjdXJlZENyZWRpdEl0ZW1TdWJUeXBlcy5DcmVkaXRcbn0sIHtcbiAgbmFtZTogJ1Vuc2VjdXJlZCBMb2FuJyxcbiAgc3ViVHlwZTogdW5zZWN1cmVkQ3JlZGl0SXRlbVN1YlR5cGVzLkNyZWRpdFxufSwge1xuICBuYW1lOiAnTWFpbCBPcmRlcicsXG4gIHN1YlR5cGU6IHVuc2VjdXJlZENyZWRpdEl0ZW1TdWJUeXBlcy5DcmVkaXRcbn0sIHtcbiAgbmFtZTogJ1N0b3JlIENhcmQnLFxuICBzdWJUeXBlOiB1bnNlY3VyZWRDcmVkaXRJdGVtU3ViVHlwZXMuQ3JlZGl0XG59LCB7XG4gIG5hbWU6ICdIaXJlIFB1cmNoYXNlJyxcbiAgc3ViVHlwZTogdW5zZWN1cmVkQ3JlZGl0SXRlbVN1YlR5cGVzLkNyZWRpdFxufSwge1xuICBuYW1lOiAnUmV2b2x2aW5nIENyZWRpdCcsXG4gIHN1YlR5cGU6IHVuc2VjdXJlZENyZWRpdEl0ZW1TdWJUeXBlcy5DcmVkaXRcbn0sIHtcbiAgbmFtZTogJ0JhbmsgT3ZlcmRyYWZ0JyxcbiAgc3ViVHlwZTogdW5zZWN1cmVkQ3JlZGl0SXRlbVN1YlR5cGVzLkNyZWRpdFxufSwge1xuICBuYW1lOiAnQ291cnQgT3JkZXInLFxuICBzdWJUeXBlOiB1bnNlY3VyZWRDcmVkaXRJdGVtU3ViVHlwZXMuQ3JlZGl0XG59LCB7XG4gIG5hbWU6ICdDQ0onLFxuICBzdWJUeXBlOiB1bnNlY3VyZWRDcmVkaXRJdGVtU3ViVHlwZXMuQ0NKXG59LCB7XG4gIG5hbWU6ICdEZWZhdWx0JyxcbiAgc3ViVHlwZTogdW5zZWN1cmVkQ3JlZGl0SXRlbVN1YlR5cGVzLkNDSlxufSwge1xuICBuYW1lOiAnSVZBJyxcbiAgc3ViVHlwZTogdW5zZWN1cmVkQ3JlZGl0SXRlbVN1YlR5cGVzLklWQVxufSwge1xuICBuYW1lOiAnQmFua3J1cHRjeScsXG4gIHN1YlR5cGU6IHVuc2VjdXJlZENyZWRpdEl0ZW1TdWJUeXBlcy5JVkFcbn1dO1xuXG52YXIgdW5zZWN1cmVkQ3JlZGl0SXRlbVNjaGVtYSA9IHtcbiAgY3JlZGl0b3I6IHtcbiAgICBfX3R5cGU6IFN0cmluZyxcbiAgICBfX3ZhbGlkYXRvcnM6IFtyZXF1aXJlZF1cbiAgfSxcbiAgYXBwbGljYW50SWQ6IHtcbiAgICBfX3R5cGU6IE51bWJlcixcbiAgICBfX3ZhbGlkYXRvcnM6IFtyZXF1aXJlZF1cbiAgfSxcbiAgY3JlZGl0VHlwZToge1xuICAgIF9fdHlwZTogTnVtYmVyLFxuICAgIF9fdmFsaWRhdG9yczogW3JlcXVpcmVkXVxuICB9LFxuICBiYWxhbmNlOiB7XG4gICAgX190eXBlOiBOdW1iZXIsXG4gICAgX192YWxpZGF0b3JzOiBbcmVxdWlyZWRdXG4gIH0sXG4gIG1vbnRobHlSZXBheW1lbnQ6IHtcbiAgICBfX3R5cGU6IE51bWJlcixcbiAgICBfX3ZhbGlkYXRvcnM6IFtyZXF1aXJlZF1cbiAgfSxcbiAgdG9CZVJlcGF5ZWQ6IHtcbiAgICBfX3R5cGU6IEJvb2xlYW5cbiAgfVxufTtcblxudmFyIHVuc2VjdXJlZENyZWRpdFNjaGVtYSA9IHtcbiAgaXRlbXM6IFt1bnNlY3VyZWRDcmVkaXRJdGVtU2NoZW1hXSxcbiAgZ2V0IGNjakFuZERlZmF1bHRzKCkge1xuICAgIHZhciBjcmVkaXRUeXBlO1xuICAgIHJldHVybiB0aGlzLml0ZW1zLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgICBjcmVkaXRUeXBlID0gdW5zZWN1cmVkQ3JlZGl0SXRlbVR5cGVzW2l0ZW0uY3JlZGl0VHlwZV07XG4gICAgICByZXR1cm4gY3JlZGl0VHlwZSAmJiBjcmVkaXRUeXBlLnN1YlR5cGUgPT09IHVuc2VjdXJlZENyZWRpdEl0ZW1TdWJUeXBlcy5DQ0o7XG4gICAgfSk7XG4gIH0sXG4gIGdldCBpdmFBbmRCYW5rcnVwdGNpZXMoKSB7XG4gICAgdmFyIGNyZWRpdFR5cGU7XG4gICAgcmV0dXJuIHRoaXMuaXRlbXMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIGNyZWRpdFR5cGUgPSB1bnNlY3VyZWRDcmVkaXRJdGVtVHlwZXNbaXRlbS5jcmVkaXRUeXBlXTtcbiAgICAgIHJldHVybiBjcmVkaXRUeXBlICYmIGNyZWRpdFR5cGUuc3ViVHlwZSA9PT0gdW5zZWN1cmVkQ3JlZGl0SXRlbVN1YlR5cGVzLklWQTtcbiAgICB9KTtcbiAgfSxcbiAgZ2V0IGNyZWRpdHMoKSB7XG4gICAgdmFyIGNyZWRpdFR5cGU7XG4gICAgcmV0dXJuIHRoaXMuaXRlbXMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIGNyZWRpdFR5cGUgPSB1bnNlY3VyZWRDcmVkaXRJdGVtVHlwZXNbaXRlbS5jcmVkaXRUeXBlXTtcbiAgICAgIHJldHVybiBjcmVkaXRUeXBlICYmIGNyZWRpdFR5cGUuc3ViVHlwZSA9PT0gdW5zZWN1cmVkQ3JlZGl0SXRlbVN1YlR5cGVzLkNyZWRpdDtcbiAgICB9KTtcbiAgfSxcbiAgZ2V0IGl0ZW1zVG9CZVJlcGF5ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXRlbXMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHJldHVybiBpdGVtLnRvQmVSZXBheWVkO1xuICAgIH0pO1xuICB9LFxuICBnZXQgdG90YWxDQ0pBbmREZWZhdWx0c0JhbGFuY2UoKSB7XG4gICAgcmV0dXJuIHN1bSh0aGlzLmNjakFuZERlZmF1bHRzLCAnYmFsYW5jZScpO1xuICB9LFxuICBnZXQgdG90YWxDQ0pBbmREZWZhdWx0c01vbnRobHlSZXBheW1lbnRzKCkge1xuICAgIHJldHVybiBzdW0odGhpcy5jY2pBbmREZWZhdWx0cywgJ21vbnRobHlSZXBheW1lbnQnKTtcbiAgfSxcbiAgZ2V0IHRvdGFsSVZBQW5kQmFua3J1cHRjaWVzQmFsYW5jZSgpIHtcbiAgICByZXR1cm4gc3VtKHRoaXMuaXZhQW5kQmFua3J1cHRjaWVzLCAnYmFsYW5jZScpO1xuICB9LFxuICBnZXQgdG90YWxJVkFBbmRCYW5rcnVwdGNpZXNNb250aGx5UmVwYXltZW50cygpIHtcbiAgICByZXR1cm4gc3VtKHRoaXMuaXZhQW5kQmFua3J1cHRjaWVzLCAnbW9udGhseVJlcGF5bWVudCcpO1xuICB9LFxuICBnZXQgdG90YWxDcmVkaXRCYWxhbmNlKCkge1xuICAgIHJldHVybiBzdW0odGhpcy5jcmVkaXRzLCAnYmFsYW5jZScpO1xuICB9LFxuICBnZXQgdG90YWxDcmVkaXRNb250aGx5UmVwYXltZW50cygpIHtcbiAgICByZXR1cm4gc3VtKHRoaXMuY3JlZGl0cywgJ21vbnRobHlSZXBheW1lbnQnKTtcbiAgfSxcbiAgZ2V0IHRvdGFsVG9CZVJlcGF5ZWRCYWxhbmNlKCkge1xuICAgIHJldHVybiBzdW0odGhpcy5pdGVtc1RvQmVSZXBheWVkLCAnYmFsYW5jZScpO1xuICB9LFxuICBnZXQgdG90YWxSZW1haW5pbmdCYWxhbmNlKCkge1xuICAgIHJldHVybiB0aGlzLnRvdGFsQ0NKQW5kRGVmYXVsdHNCYWxhbmNlICsgdGhpcy50b3RhbElWQUFuZEJhbmtydXB0Y2llc0JhbGFuY2UgKyB0aGlzLnRvdGFsQ3JlZGl0QmFsYW5jZSAtIHRoaXMudG90YWxUb0JlUmVwYXllZEJhbGFuY2U7XG4gIH0sXG4gIGdldCB0b3RhbFJlbWFpbmluZ01vbnRobHlSZXBheW1lbnRzKCkge1xuICAgIHJldHVybiB0aGlzLnRvdGFsQ0NKQW5kRGVmYXVsdHNNb250aGx5UmVwYXltZW50cyArIHRoaXMudG90YWxJVkFBbmRCYW5rcnVwdGNpZXNNb250aGx5UmVwYXltZW50cyArIHRoaXMudG90YWxDcmVkaXRNb250aGx5UmVwYXltZW50cztcbiAgfSxcbiAgYWRkVW5zZWN1cmVkQ3JlZGl0OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgbmV3SXRlbSA9IHRoaXMuaXRlbXMuY3JlYXRlKCk7XG4gICAgbmV3SXRlbS5iYWxhbmNlID0gMDtcbiAgICBuZXdJdGVtLm1vbnRobHlSZXBheW1lbnQgPSAwO1xuICAgIHRoaXMuaXRlbXMucHVzaChuZXdJdGVtKTtcbiAgICByZXR1cm4gbmV3SXRlbTtcbiAgfSxcbiAgcmVtb3ZlVW5zZWN1cmVkQ3JlZGl0OiBmdW5jdGlvbih1bnNlY3VyZWRDcmVkaXRJdGVtKSB7XG4gICAgdmFyIGlkeCA9IHRoaXMuaXRlbXMuaW5kZXhPZih1bnNlY3VyZWRDcmVkaXRJdGVtKTtcblxuICAgIGlmIChpZHggIT09IC0xKSB7XG4gICAgICByZXR1cm4gdGhpcy5pdGVtcy5zcGxpY2UoaWR4LCAxKTtcbiAgICB9XG4gIH1cbn07XG5cblxuLyoqXG4gKiBGdWxsIEFzc2Vzc21lbnRcbiAqL1xudmFyIGZ1bGxBc3Nlc3NtZW50U2NoZW1hID0ge1xuICBicm9rZXJSZWY6IFN0cmluZyxcbiAgYXBwbGljYW50czogYXBwbGljYW50c1NjaGVtYSxcbiAgaG91c2Vob2xkOiBob3VzZWhvbGRTY2hlbWEsXG4gIGxvYW5EZXRhaWxzOiBsb2FuRGV0YWlsc1NjaGVtYSxcbiAgc2VjdXJlZENyZWRpdDogc2VjdXJlZENyZWRpdFNjaGVtYSxcbiAgdW5zZWN1cmVkQ3JlZGl0OiB1bnNlY3VyZWRDcmVkaXRTY2hlbWFcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBmdWxsQXNzZXNzbWVudFNjaGVtYTogZnVsbEFzc2Vzc21lbnRTY2hlbWEsXG4gIHVuc2VjdXJlZENyZWRpdEl0ZW1UeXBlczogdW5zZWN1cmVkQ3JlZGl0SXRlbVR5cGVzXG59O1xuIiwiZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgaW1tZWRpYXRlKSB7XG4gIHZhciB0aW1lb3V0O1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNvbnRleHQgPSB0aGlzLFxuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgaWYgKCFpbW1lZGlhdGUpIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgfTtcbiAgICB2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgIGlmIChjYWxsTm93KSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICB9O1xufVxuXG4vKipcbiAqIEFwcGxpY2FudHNWaWV3IENvbnN0cnVjdG9yIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIEFwcGxpY2FudHNWaWV3KGVsLCBwYXJlbnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgYXBwbGljYW50cyA9IHBhcmVudC5mdWxsQXNzZXNzbWVudC5hcHBsaWNhbnRzO1xuXG4gIHRoaXMuZWwgPSBlbDtcbiAgdGhpcy5hcHBsaWNhbnRzID0gYXBwbGljYW50cztcbiAgdGhpcy5lZGl0QXBwbGljYW50ID0gYXBwbGljYW50cy5pdGVtc1swXTtcblxuICBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgc3VwZXJ2aWV3cyhlbCwgcGFyZW50KTtcbiAgfVxuXG4gIHZhciBkaXNwbGF5TGlzdEVsID0gZWwucXVlcnlTZWxlY3RvckFsbCgnb2wnKVswXTtcblxuICBmdW5jdGlvbiByZW5kZXJEaXNwbGF5TGlzdCgpIHtcbiAgICBzdXBlcnZpZXdzKGRpc3BsYXlMaXN0RWwsIHNlbGYpO1xuICB9XG5cbiAgdmFyIGVycm9yc0VsID0gZWwucXVlcnlTZWxlY3RvckFsbCgnLmVycm9ycycpWzBdO1xuXG4gIGZ1bmN0aW9uIHJlbmRlckVycm9ycygpIHtcbiAgICBzdXBlcnZpZXdzKGVycm9yc0VsLCBzZWxmKTtcbiAgfVxuXG4gIHZhciB0b3RhbEVsID0gZWwucXVlcnlTZWxlY3RvckFsbCgnW3VpLXRleHQ9XCJ0b3RhbE5ldE1vbnRobHlJbmNvbWVcIl0nKVswXTtcblxuICBmdW5jdGlvbiByZW5kZXJUb3RhbCgpIHtcbiAgICBpZiAoc2VsZi5lZGl0QXBwbGljYW50KSB7XG4gICAgICBzdXBlcnZpZXdzKHRvdGFsRWwsIHNlbGYuZWRpdEFwcGxpY2FudC5tb250aGx5SW5jb21lKTtcbiAgICB9XG4gIH1cblxuICBhcHBsaWNhbnRzLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICByZW5kZXJEaXNwbGF5TGlzdCgpO1xuICAgIHJlbmRlckVycm9ycygpO1xuICAgIHJlbmRlclRvdGFsKCk7XG4gIH0pO1xuXG4gIHRoaXMuYWRkQXBwbGljYW50ID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBkID0gRGF0ZS5ub3coKTtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgYXBwbGljYW50cy5hZGRBcHBsaWNhbnQoKTtcbiAgICB0aGlzLnNldEVkaXRBcHBsaWNhbnQoYXBwbGljYW50cy5pdGVtc1thcHBsaWNhbnRzLml0ZW1zLmxlbmd0aCAtIDFdKTtcbiAgICBjb25zb2xlLmxvZyhEYXRlLm5vdygpIC0gZCk7XG4gIH07XG5cbiAgdGhpcy5yZW1vdmVBcHBsaWNhbnQgPSBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGFwcGxpY2FudHMucmVtb3ZlQXBwbGljYW50KHRoaXMuZWRpdEFwcGxpY2FudCk7XG4gICAgdGhpcy5zZXRFZGl0QXBwbGljYW50KGFwcGxpY2FudHMuaXRlbXNbMF0pO1xuICB9O1xuXG4gIHRoaXMuc2V0RWRpdEFwcGxpY2FudCA9IGZ1bmN0aW9uKGFwcGxpY2FudCkge1xuICAgIGlmICh0aGlzLmVkaXRBcHBsaWNhbnQgPT09IGFwcGxpY2FudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZWRpdEFwcGxpY2FudCA9IGFwcGxpY2FudDtcbiAgICByZW5kZXIoKTtcbiAgfTtcblxuICAvLyB0b2RvOiBkb24ndCBsaWtlIHRoaXNcbiAgLy8gbmVlZCBiaW5kIC8gdmFsdWUgZm9ybWF0dGVycz9cbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge1xuICAgIGRvYlVpOiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTcGVjaWFsIERhdGUgUHJvcGVydHkgdGhhdCBhbGxvdyB1c2UgdG8gYmluZCB0byBhblxuICAgICAgICAvLyA8aW5wdXQgdHlwZT1EYXRlPi4gVGhpcyBlbGVtZW50IHJlcXVpcmVzIGRhdGUgaW4gWVlZWS1NTS1ERFxuICAgICAgICB2YXIgZG9iID0gdGhpcy5lZGl0QXBwbGljYW50LmRvYjtcbiAgICAgICAgaWYgKGRvYikge1xuICAgICAgICAgIHJldHVybiBtb21lbnQoZG9iKS5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLmVkaXRBcHBsaWNhbnQuZG9iID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBVbnNlY3VyZWRDcmVkaXQgVmlld1xuICovXG5mdW5jdGlvbiBVbnNlY3VyZWRDcmVkaXRWaWV3KGVsLCBwYXJlbnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgdW5zZWN1cmVkQ3JlZGl0ID0gcGFyZW50LmZ1bGxBc3Nlc3NtZW50LnVuc2VjdXJlZENyZWRpdDtcblxuICB0aGlzLmVsID0gZWw7XG4gIHRoaXMudW5zZWN1cmVkQ3JlZGl0ID0gdW5zZWN1cmVkQ3JlZGl0O1xuXG4gIGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICBzdXBlcnZpZXdzKGVsLCBwYXJlbnQpO1xuICB9XG5cbiAgdmFyIGVycm9yc0VsID0gZWwucXVlcnlTZWxlY3RvckFsbCgnLmVycm9ycycpWzBdO1xuXG4gIGZ1bmN0aW9uIHJlbmRlckVycm9ycygpIHtcbiAgICBzdXBlcnZpZXdzKGVycm9yc0VsLCBzZWxmKTtcbiAgfVxuXG4gIHZhciBzdW1tYXJ5RWwgPSBlbC5xdWVyeVNlbGVjdG9yQWxsKCd0Zm9vdCcpWzBdO1xuXG4gIGZ1bmN0aW9uIHJlbmRlclN1bW1hcnkoKSB7XG4gICAgc3VwZXJ2aWV3cyhzdW1tYXJ5RWwsIHNlbGYpO1xuICB9XG5cbiAgdW5zZWN1cmVkQ3JlZGl0Lm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICByZW5kZXJFcnJvcnMoKTtcbiAgICByZW5kZXJTdW1tYXJ5KCk7XG4gIH0pO1xuXG4gIHRoaXMuYWRkVW5zZWN1cmVkQ3JlZGl0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGQgPSBEYXRlLm5vdygpO1xuICAgIHVuc2VjdXJlZENyZWRpdC5hZGRVbnNlY3VyZWRDcmVkaXQoKTtcbiAgICByZW5kZXIoKTtcbiAgICBjb25zb2xlLmxvZyhEYXRlLm5vdygpIC0gZCk7XG4gIH07XG5cbiAgdGhpcy5yZW1vdmVVbnNlY3VyZWRDcmVkaXQgPSBmdW5jdGlvbihpdGVtKSB7XG4gICAgdW5zZWN1cmVkQ3JlZGl0LnJlbW92ZVVuc2VjdXJlZENyZWRpdChpdGVtKTtcbiAgICByZW5kZXIoKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBWaWV3c1xuICovXG5mdW5jdGlvbiBGdWxsQXNzZXNzbWVudFZpZXcoZWwsIGZ1bGxBc3Nlc3NtZW50LCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB0aGlzLmVsID0gZWw7XG4gIHRoaXMuZnVsbEFzc2Vzc21lbnQgPSBmdWxsQXNzZXNzbWVudDtcblxuICAvKipcbiAgICogVGFic1xuICAgKi9cbiAgdGhpcy50YWJzID0gW3tcbiAgICBuYW1lOiAnQXBwbGljYW50cycsXG4gICAgdGFyZ2V0OiAnYXBwbGljYW50cydcbiAgfSwge1xuICAgIG5hbWU6ICdIb3VzZWhvbGQnLFxuICAgIHRhcmdldDogJ2hvdXNlaG9sZCdcbiAgfSwge1xuICAgIG5hbWU6ICdDcmVkaXQgQ29tbWl0bWVudHMnLFxuICAgIHRhcmdldDogJ2NyZWRpdCdcbiAgfV07XG4gIHRoaXMuYWN0aXZlVGFiID0gdGhpcy50YWJzW29wdGlvbnMudGFiIHx8IDBdO1xuICB0aGlzLnNldEFjdGl2ZVRhYiA9IGZ1bmN0aW9uKHRhYikge1xuICAgIHRoaXMuYWN0aXZlVGFiID0gdGFiO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH07XG5cbiAgdGhpcy5nZXRBcHBsaWNhbnRGdWxsTmFtZSA9IGZ1bmN0aW9uKGFwcGxpY2FudCkge1xuICAgIHJldHVybiBhcHBsaWNhbnQuZnVsbE5hbWUgfHwgJ0FwcGxpY2FudCAnICsgKGFwcGxpY2FudC5fX3BhcmVudC5pbmRleE9mKGFwcGxpY2FudCkgKyAxKTtcbiAgfTtcblxuICAvKipcbiAgICogQXBwbGljYW50cyBDaGlsZCBWaWV3XG4gICAqL1xuICB2YXIgYXBwbGljYW50c1ZpZXdFbCA9IGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ1t1aS13aXRoPVwiYXBwbGljYW50c1ZpZXdcIl0nKVswXTtcbiAgdGhpcy5hcHBsaWNhbnRzVmlldyA9IG5ldyBBcHBsaWNhbnRzVmlldyhhcHBsaWNhbnRzVmlld0VsLCB0aGlzKTtcblxuICAvKipcbiAgICogU3VtbWFyeVxuICAgKi9cbiAgdmFyIHN1bW1hcnlFbCA9IGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJy5zdW1tYXJ5JylbMF07XG4gIGZ1bGxBc3Nlc3NtZW50Lm9uKCdjaGFuZ2UnLCBkZWJvdW5jZShmdW5jdGlvbihlKSB7XG4gICAgdmFyIGQgPSBEYXRlLm5vdygpO1xuICAgIHN1cGVydmlld3Moc3VtbWFyeUVsLCBzZWxmKTtcbiAgICBjb25zb2xlLmxvZygncmVuZGVyIHN1bW1hcnknLCBEYXRlLm5vdygpIC0gZCk7XG4gIH0sIDUwKSk7XG5cbiAgLy8gTGV0J3MgZGlyZWN0bHkgbWFuaXB1bGF0ZSB0aGUgRE9NIHRvIHRvZ2dsZUVycm9ycyBmb3IgcGVyZm9ybWFjZVxuICB2YXIgZXJyb3JzUG9wb3ZlckVsID0gc3VtbWFyeUVsLnF1ZXJ5U2VsZWN0b3JBbGwoJy5wb3BvdmVyLmVycm9ycycpWzBdO1xuICB0aGlzLnRvZ2dsZUVycm9ycyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjdXJyID0gZXJyb3JzUG9wb3ZlckVsLnN0eWxlLmRpc3BsYXk7XG4gICAgZXJyb3JzUG9wb3ZlckVsLnN0eWxlLmRpc3BsYXkgPSAoflsnbm9uZScsICcnXS5pbmRleE9mKGN1cnIpKSA/ICdibG9jaycgOiAnbm9uZSc7XG4gIH07XG5cbiAgLyoqXG4gICAqIEhvdXNlaG9sZFxuICAgKi9cbiAgdmFyIGhvdXNlaG9sZFZpZXdFbCA9IGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ1t1aS13aXRoPVwiaG91c2Vob2xkVmlld1wiXScpWzBdO1xuICBmdWxsQXNzZXNzbWVudC5ob3VzZWhvbGQub24oJ2NoYW5nZScsIGZ1bmN0aW9uKGUpIHtcbiAgICBzdXBlcnZpZXdzKGhvdXNlaG9sZFZpZXdFbCwgc2VsZik7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiBVbnNlY3VyZWQgQ3JlZGl0XG4gICAqL1xuICB2YXIgdW5zZWN1cmVkQ3JlZGl0Vmlld0VsID0gZWwucXVlcnlTZWxlY3RvckFsbCgnW3VpLXdpdGg9XCJ1bnNlY3VyZWRDcmVkaXRWaWV3XCJdJylbMF07XG4gIHRoaXMudW5zZWN1cmVkQ3JlZGl0VmlldyA9IG5ldyBVbnNlY3VyZWRDcmVkaXRWaWV3KHVuc2VjdXJlZENyZWRpdFZpZXdFbCwgdGhpcyk7XG5cblxuICB0aGlzLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBkID0gRGF0ZS5ub3coKTtcbiAgICBzdXBlcnZpZXdzKHRoaXMuZWwsIHRoaXMpO1xuICAgIGNvbnNvbGUubG9nKCdyZW5kZXIgbWFpbicsIERhdGUubm93KCkgLSBkKTtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGdWxsQXNzZXNzbWVudFZpZXc7XG4iXX0=
