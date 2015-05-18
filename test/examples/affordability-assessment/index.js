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
