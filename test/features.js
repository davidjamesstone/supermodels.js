
    // Object.model = supermodels;

    // var required = {
    //   name: 'required',
    //   test: function(value) {
    //     if (value) return ''
    //   },
    //   whatever: 42
    // };

    // var hasScores = {
    //   name: 'hasScores',
    //   test: function() {
    //     if (!this.scores.length) return 'Scores are required';
    //   },
    //   whatever: 45
    // };

    // var personSchema = {
    //   firstName: {
    //     __validators: [
    //       required,
    //       function(value) {
    //         if (value === 'Frog') {
    //           return 'No frogs allowed.'
    //         }
    //       }
    //     ]
    //   },
    //   get fullName() {
    //     return this.firstName + ' ' + this.lastName;
    //   },
    //   set fullName(value) {
    //     var parts = value.split(' ');
    //     this.firstName = parts[0];
    //     this.lastName = parts[1];
    //   },
    //   line1: {
    //     __value: 'Marble Arch'
    //   },
    //   val: '2',
    //   val1: 2,
    //   fn: function() {
    //     console.log(this);
    //   },
    //   _privateProperty: String,
    //   typedString: String,
    //   untypedString: null,
    //   lastName: {
    //     __validators: 'required'
    //   },
    //   age: {
    //     __validators: 'required|number'
    //   },
    //   address: {
    //     line1: {
    //       __value: 'Marble Arch'
    //     },
    //     line2: {
    //       __validators: [required]
    //     },
    //     country: 'UK',
    //     fullAddress1: {
    //       __get: function() {

    //       },
    //       __set: function(value) {

    //       },
    //       __validators: []
    //     },
    //     get fullAddress() {
    //       return this.line1 + ', ' + this.line2 + ', ' + this.country;
    //     },
    //     set fullAddress(value) {
    //       var parts = value.split(', ');
    //       this.line1 = parts[0];
    //       this.line2 = parts[1];
    //       this.country = parts[2];
    //     },
    //     latLong: {
    //       lat: {
    //         __type: Number
    //       },
    //       long: {
    //         __type: Number
    //       }
    //     }
    //   },
    //   notes: {},
    //   scores: [],
    //   items: [{
    //     name: {
    //       __type: String
    //     },
    //     quantity: Number,
    //     subItems: [{
    //       subName: {
    //         __type: String
    //       },
    //       subMixed: 'defaultvalue'
    //     }]
    //   }],
    //   __validators: [hasScores]
    // };

    // var person = Object.model(personSchema);

    // person.on('change', function(e) {
    //   console.log(e);
    // });

    // person.fullName = 'Dave Stone';
    // person.address.fullAddress = '81 Moss Road, Cheshire, UK';
    // person.address.latLong.lat = 65.56;
    // person.address.latLong.long = 'Invalid value. Because I\'m typed, this should result in me becoming NaN';

    // person.items.on('push', function() {
    //   console.log('push')
    // });

    // var item = person.items.create();
    // person.items.push(item);

    // var subItem = item.subItems.create();
    // item.subItems.push(subItem);

    // window.person = person;

    // // var Address = make({
    // //   name: 'Address',
    // //   keys: {
    // //     line1: {
    // //       type: String
    // //     },
    // //     line2: {
    // //       type: String
    // //     }
    // //   }
    // // });

    // // var Person = make({
    // //   name: 'Person',
    // //   keys: {
    // //     name: {
    // //       type: String,
    // //       validators: ''
    // //     },
    // //     age: {
    // //       type: Number,
    // //       validators: ''
    // //     },
    // //     isMale: {
    // //       type: Boolean,
    // //       validators: ''
    // //     },
    // //     address: {
    // //       type: 'Address'
    // //     }
    // //   }
    // // });

    // // var p = new Person();
    // // p.descendants;
    // // var el = document.getElementById('egg');

    // // p.on('change', function(e) {
    // //   console.log(e);
    // // });

    // // p.on('change:name', function(e) {
    // //   console.log(e);
    // // });

    // // p.name = 'mandy';
    // // p.age = '56';
    // // p.isMale = 1;
    // // p.address.line1 = '81 Moss Road';
    // // p.address.line2 = '82 Moss Road';


    // // p.address.on('change:line2', function(e) {
    // //   console.log(e);
    // // });

    // // p.address.line2 = '83 Moss Road';

    // // el.innerText = Object.keys(p);