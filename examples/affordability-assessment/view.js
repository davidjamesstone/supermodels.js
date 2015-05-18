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
