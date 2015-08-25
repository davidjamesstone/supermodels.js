var test = require('tape')
var supermodels = require('../')
var addressSchema = require('./schema/address')

test('traversal examples', function (t) {
  t.plan(10)

  var schema = {
    name: String,
    address: addressSchema,
    scores: [{
      mark: Number,
      createdOn: Date
    }]
  }
  var Model = supermodels(schema)
  var model = new Model()

  t.equal(model.__ancestors.length, 0)
  t.equal(model.__descendants.length, 3)
  t.equal(model.__descendants[0], model.address)
  t.equal(model.__descendants[1], model.address.latLong)
  t.equal(model.__descendants[2], model.scores)

  var score = model.scores.create()
  score.mark = 42
  score.createdOn = Date.now()
  model.scores.push(score)

  t.equal(model.__descendants.length, 4)
  t.equal(model.__descendants[3], score)

  // check first scores ancestors
  t.equal(score.__ancestors.length, 2)
  t.equal(score.__ancestors[0], model.scores)
  t.equal(score.__ancestors[1], model)
})

test('traversal examples 2', function (t) {
  t.plan(38)

  var scoreSchema = {
    mark: Number,
    createdOn: Date
  }
  var Score = supermodels(scoreSchema)
  var Address = supermodels(addressSchema)

  var schema = {
    name: String,
    address: Address,
    scores: [Score]
  }
  var Model = supermodels(schema)
  var model = new Model()

  t.equal(model.__isRoot, true)
  t.equal(model.__name, '')
  t.equal(model.__path, '')

  t.equal(model.__hasAncestors, false)
  t.equal(model.__hasDescendants, true)

  model.address = new Address()
  t.equal(model.__ancestors.length, 0)
  t.equal(model.__descendants.length, 3)
  t.equal(model.__descendants[0], model.address)
  t.equal(model.__descendants[1], model.address.latLong)
  t.equal(model.__descendants[2], model.scores)
  t.equal(model.__children.length, 2)
  t.equal(model.__children[0], model.address)
  t.equal(model.__children[1], model.scores)

  // these following tests illustrates a subtle difference
  // between the two alternative ways of creating and
  // composing different models together.
  //
  var score = new Score()
  score.mark = 42
  score.createdOn = Date.now()

  // using the `new Score()` method the new Score instance
  // is not attached to the model until it's push onto the array.
  // It therefore doesn't have a name or path
  t.equal(score.__isRoot, true)
  t.equal(score.__name, '')
  t.equal(score.__path, '')
  model.scores.push(score)
  t.equal(score.__isRoot, false)
  t.equal(score.__name, '0')
  t.equal(score.__path, 'scores.0')

  t.equal(model.__descendants.length, 4)
  t.equal(model.__descendants[3], score)
  t.equal(score.__isRoot, false)
  t.equal(score.__hasAncestors, true)
  t.equal(score.__hasDescendants, false)
  t.equal(score.__ancestors.length, 2)
  t.equal(score.__ancestors[0], model.scores)
  t.equal(score.__ancestors[1], model)

  // the alternative way of creating an array instance
  // automatically attaches the `score` instance to the model
  // This way it has a path defined before it's actually pushed
  // into the array.
  var score2 = model.scores.create()
  score2.mark = 42
  score2.createdOn = Date.now()

  t.equal(score2.__isRoot, true)
  t.equal(score2.__name, '')
  t.equal(score2.__path, '')
  model.scores.push(score2)
  t.equal(score2.__isRoot, false)
  t.equal(score2.__name, '1')
  t.equal(score2.__path, 'scores.1')

  t.equal(model.__descendants.length, 5)
  t.equal(model.__descendants[4], score2)

  // check first scores ancestors
  t.equal(score2.__ancestors.length, 2)
  t.equal(score2.__ancestors[0], model.scores)
  t.equal(score2.__ancestors[1], model)
})
