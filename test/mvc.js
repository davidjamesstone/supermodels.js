var test = require('tape');
var supermodels = require('../');


test('mvc', function(t) {

  t.plan(7);

  // helpers
  //
  function required(name, type, otherValidators) {
    return {
      __type: type || String,
      __validators: [function(value) {
        if (!value) {
          return name + ' is required';
        }
      }].concat(otherValidators || [])
    }
  }

  /*
   * Model
   */
  var formModelSchema = {
    firstName: required('First name'),
    lastName: required('Last name'),
    dateOfBirth: required('Date of Birth', Date),
    address: {
      number: required('House number', Number),
      line1: required('Line 1'),
      line2: required('Line 2'),
      country: required('Country'),
      fullAddress: {
        __get: function() {
          return this.line1 + ', ' + this.line2;
        }
      },
      get fullAddress1() {
        return this.line1 + ', ' + this.line2;
      }
    },
    display: {
      __get: function() {
        return this.firstName + ' of ' + this.address.country;
      }
    }
  };
  var FormModel = supermodels(formModelSchema);

  /*
   * Controller
   */
  var formCtrlSchema = {
    model: FormModel
  };
  var FormCtrl = supermodels(formCtrlSchema, function() {
    this.model = new FormModel();
  });

  var formCtrl = new FormCtrl();
  var formModel = formCtrl.model;


  console.log(formModel.errors.map(function(item) {
    return item.target.__path + '.' + item.key + ': ' + item.error;
  }));

  t.equal(formModel.errors.length, 7);
  t.equal(formModel.errors[0].error, 'First name is required');
  t.equal(formModel.address.errors.length, 4);
  t.equal(formModel.address.errors[0].error, 'House number is required');

  formModel.firstName = 'Elizabeth II';
  formModel.address.number = 42;
  formModel.address.line1 = 'Buckingham Palace';
  formModel.address.line2 = 'London';
  formModel.address.country = 'UK';

  console.log(formModel.address.fullAddress);
  console.log(formModel.address.fullAddress1);
  console.log(JSON.stringify(formModel));


  t.equal(formModel.address.fullAddress, 'Buckingham Palace, London');
  t.equal(formModel.address.fullAddress1, 'Buckingham Palace, London');
  t.equal(formModel.display, 'Elizabeth II of UK');


});