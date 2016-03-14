'user strict'

// some common helpers used throughout these tests
//
function required (name, type, otherValidators) {
  return {
    __type: type || String,
    __validators: [function (value, key) {
      if (!value) {
        return {
          key: key,
          message: name + ' is required'
        }
      }
    }].concat(otherValidators || [])
  }
}

function passwordValidator (value, key) {
  if (value) {
    if (value.length < 5) {
      return {
        key: key,
        message: 'Password should be 5 or more characters'
      }
    }
  }
}

module.exports = {
  required: required,
  passwordValidator: passwordValidator
}
