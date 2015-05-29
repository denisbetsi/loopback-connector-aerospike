// This test written in mocha+should.js
var should = require('./init.js');

var Superhero, User, Post, PostWithStringId, db;

describe('Aerospike connector', function () {

    // before(function (done) {
    //
    //
    //   User = db.define('User', {
    //     name: { type: String, index: true },
    //     email: { type: String, index: true, unique: true },
    //     age: Number,
    //     icon: Buffer
    //   }, {
    //     indexes: {
    //       name_age_index: {
    //         keys: {name: 1, age: -1}
    //       }, // The value contains keys and optinally options
    //       age_index: {age: -1} // The value itself is for keys
    //     }
    //   });
    //
    //   Product = db.define('Product', {
    //     name: { type: String, length: 255, index: true },
    //     description:{ type: String},
    //     price: { type: Number },
    //     pricehistory: { type: Object }
    //   }, {
    //     mongodb: {
    //       collection: 'ProductCollection' // Customize the collection name
    //     }
    //   });
    //
    //   PostWithStringId = db.define('PostWithStringId', {
    //     id: {type: String, id: true},
    //     title: { type: String, length: 255, index: true },
    //     content: { type: String }
    //   });
    //
    //   PostWithObjectId = db.define('PostWithObjectId', {
    //     _id: {type: db.ObjectID, id: true},
    //     title: { type: String, length: 255, index: true },
    //     content: { type: String }
    //   });
    //
    //   PostWithNumberUnderscoreId = db.define('PostWithNumberUnderscoreId', {
    //     _id: {type: Number, id: true},
    //     title: { type: String, length: 255, index: true },
    //     content: { type: String }
    //   });
    //
    //   PostWithNumberId = db.define('PostWithNumberId', {
    //     id: {type: Number, id: true},
    //     title: { type: String, length: 255, index: true },
    //     content: { type: String }
    //   });
    //
    //   User.hasMany(Post);
    //   Post.belongsTo(User);
    // });
    //
    // beforeEach(function (done) {
    //   User.destroyAll(function () {
    //     Post.destroyAll(function () {
    //       PostWithObjectId.destroyAll(function () {
    //         PostWithNumberId.destroyAll(function () {
    //           PostWithNumberUnderscoreId.destroyAll(function () {
    //             PostWithStringId.destroyAll(function () {
    //               done();
    //             });
    //           });
    //         });
    //       });
    //     });
    //   });
    // });

    describe('datasource init', function() {
        it('should respond with {}.connected true', function(done) {
            db = getDataSource();
            should(db.connected).be.ok;
            done();
        });
    })

    describe('.ping(cb)', function() {
        it('should return true for valid connection', function(done) {
            db.ping(function(success) {
                should(success).be.ok;
                done();
            });

        });

        // Test removed for now until:
        // https://github.com/aerospike/aerospike-client-nodejs/issues/58
        // is fixed, until then this test will always fail.
        //
        // it('should report connection errors', function(done) {
        //   var ds = getDataSource({
        //     host: 'localhost',
        //     port: 4 // unassigned by IANA
        //   });
        //   ds.ping(function(success) {
        //       console.log(success)
        //       should(success).equal(false);
        //       done();
        //   });
        // });
    });

    describe('Model creation', function() {
        it('should define a basic model', function() {
            Post = db.define('Post', {
                title: { type: String, length: 255},
                content: { type: String },
                comments: [String]
            }, {
                aerospike: {
                    idField: 'title'
                }
            });
        });
        it('define a model with basic indexes', function() {
            Superhero = db.define('Superhero', {
                name: { type: String, index: true },
                power: { type: String, index: true, unique: true },
                address: { type: String, required: false },
                description: { type: String, required: false },
                age: Number,
                icon: Buffer
            });
        });
    });

    describe('Model instance creation', function() {
        it('create should return post with added id field', function (done) {
            Post.create({title: 'Post1', content: 'Post content'}, function (err, post) {
                should.not.exist(err);
                should.exist(post.id);
                should.exist(post.title);
                should.exist(post.content);

                done();
            });
        });
        it('create should return post with provided id field', function (done) {
            Post.create({id:'foo', title: 'Post2', content: 'Post content'}, function (err, post) {
                should.not.exist(err);
                should.exist(post.id);
                should.exist(post.title);
                should.exist(post.content);

                done();
            });
        });
    });

    it('all return should honor filter.fields, with `_id` as defined id', function (done) {
        var post = new PostWithObjectId({title: 'a', content: 'AAA'})
        post.save(function (err, post) {
            PostWithObjectId.all({fields: ['title'], where: {title: 'a'}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.lengthOf(1);
                post = posts[0];
                post.should.have.property('title', 'a');
                post.should.have.property('content', undefined);
                should.not.exist(post._id);

                done();
            });

        });
    });

    it('should support Buffer type', function (done) {
        User.create({name: 'John', icon: new Buffer('1a2')}, function (e, u) {
            User.findById(u.id, function (e, user) {
                user.icon.should.be.an.instanceOf(Buffer);
                done();
            });
        });
    });

    it('hasMany should support additional conditions', function (done) {
        User.create(function (e, u) {
            u.posts.create({}, function (e, p) {
                u.posts({where: {id: p.id}}, function (err, posts) {
                    should.not.exist(err);
                    posts.should.have.lengthOf(1);

                    done();
                });
            });
        });
    });

    it('create should return id field but not mongodb _id', function (done) {
        Post.create({title: 'Post1', content: 'Post content'}, function (err, post) {
            //console.log('create should', err, post);
            should.not.exist(err);
            should.exist(post.id);
            should.not.exist(post._id);

            done();
        });
    });

    it('should allow to find by id string', function (done) {
        Post.create({title: 'Post1', content: 'Post content'}, function (err, post) {
            Post.findById(post.id.toString(), function (err, p) {
                should.not.exist(err);
                should.exist(p);
                done();
            });
        });
    });

    it('should allow custom collection name', function (done) {
        Post.create({title: 'Post1', content: 'Post content'}, function (err, post) {
            Post.dataSource.connector.db.collection('PostCollection').findOne({_id: post.id}, function (err, p) {
                should.not.exist(err);
                should.exist(p);
                done();
            });
        });
    });

    it('should allow to find by id using where', function (done) {
        Post.create({title: 'Post1', content: 'Post1 content'}, function (err, p1) {
            Post.create({title: 'Post2', content: 'Post2 content'}, function (err, p2) {
                Post.find({where: {id: p1.id}}, function (err, p) {
                    should.not.exist(err);
                    should.exist(p && p[0]);
                    p.length.should.be.equal(1);
                    // Not strict equal
                    p[0].id.should.be.eql(p1.id);
                    done();
                });
            });
        });
    });

    it('should allow to find by id using where inq', function (done) {
        Post.create({title: 'Post1', content: 'Post1 content'}, function (err, p1) {
            Post.create({title: 'Post2', content: 'Post2 content'}, function (err, p2) {
                Post.find({where: {id: {inq: [p1.id]}}}, function (err, p) {
                    should.not.exist(err);
                    should.exist(p && p[0]);
                    p.length.should.be.equal(1);
                    // Not strict equal
                    p[0].id.should.be.eql(p1.id);
                    done();
                });
            });
        });
    });

    it('should allow to find by number id using where', function (done) {
        PostWithNumberId.create({id: 1, title: 'Post1', content: 'Post1 content'}, function (err, p1) {
            PostWithNumberId.create({id: 2, title: 'Post2', content: 'Post2 content'}, function (err, p2) {
                PostWithNumberId.find({where: {id: p1.id}}, function (err, p) {
                    should.not.exist(err);
                    should.exist(p && p[0]);
                    p.length.should.be.equal(1);
                    p[0].id.should.be.eql(p1.id);
                    done();
                });
            });
        });
    });

    it('should allow to find by number id using where inq', function (done) {
        PostWithNumberId.create({id: 1, title: 'Post1', content: 'Post1 content'}, function (err, p1) {
            PostWithNumberId.create({id: 2, title: 'Post2', content: 'Post2 content'}, function (err, p2) {
                PostWithNumberId.find({where: {id: {inq: [1]}}}, function (err, p) {
                    should.not.exist(err);
                    should.exist(p && p[0]);
                    p.length.should.be.equal(1);
                    p[0].id.should.be.eql(p1.id);
                    PostWithNumberId.find({where: {id: {inq: [1, 2]}}}, function (err, p) {
                        should.not.exist(err);
                        p.length.should.be.equal(2);
                        p[0].id.should.be.eql(p1.id);
                        p[1].id.should.be.eql(p2.id);
                        PostWithNumberId.find({where: {id: {inq: [0]}}}, function (err, p) {
                            should.not.exist(err);
                            p.length.should.be.equal(0);
                            done();
                        });
                    });
                });
            });
        });
    });

    it('save should not return mongodb _id', function (done) {
        Post.create({title: 'Post1', content: 'Post content'}, function (err, post) {
            post.content = 'AAA';
            post.save(function(err, p) {
                should.not.exist(err)
                should.not.exist(p._id);
                p.id.should.be.equal(post.id);
                p.content.should.be.equal('AAA')

                done();
            });
        });
    });

    it('find should return an object with an id, which is instanceof ObjectID, but not mongodb _id', function (done) {
        Post.create({title: 'Post1', content: 'Post content'}, function (err, post) {
            Post.findById(post.id, function (err, post) {
                should.not.exist(err);
                post.id.should.be.an.instanceOf(db.ObjectID);
                should.not.exist(post._id);

                done();
            });

        });
    });

    describe('updateAll', function () {
        it('should update the instance matching criteria', function (done) {
            User.create({name: 'Al', age: 31, email:'al@strongloop'}, function (err1, createdusers1) {
                should.not.exist(err1);
                User.create({name: 'Simon', age: 32,  email:'simon@strongloop'}, function (err2, createdusers2) {
                    should.not.exist(err2);
                    User.create({name: 'Ray', age: 31,  email:'ray@strongloop'}, function (err3, createdusers3) {
                        should.not.exist(err3);

                        User.updateAll({age:31},{company:'strongloop.com'},function(err,updatedusers) {
                            should.not.exist(err);
                            updatedusers.should.have.property('count', 2);

                            User.find({where:{age:31}},function(err2,foundusers) {
                                should.not.exist(err2);
                                foundusers[0].company.should.be.equal('strongloop.com');
                                foundusers[1].company.should.be.equal('strongloop.com');

                                done();
                            });

                        });
                    });
                });
            });

        });

        it('should clean the data object', function (done) {
            User.dataSource.settings.allowExtendedOperators = true;

            User.create({name: 'Al', age: 31, email:'al@strongloop'}, function (err1, createdusers1) {
                should.not.exist(err1);
                User.create({name: 'Simon', age: 32,  email:'simon@strongloop'}, function (err2, createdusers2) {
                    should.not.exist(err2);
                    User.create({name: 'Ray', age: 31,  email:'ray@strongloop'}, function (err3, createdusers3) {
                        should.not.exist(err3);

                        User.updateAll({}, {age: 40, '$set': {age: 39}},function(err,updatedusers) {
                            should.not.exist(err);
                            updatedusers.should.have.property('count', 3);

                            User.find({where:{age:40}},function(err2, foundusers) {
                                should.not.exist(err2);
                                foundusers.length.should.be.equal(0);

                                User.find({where:{age:39}}, function(err3, foundusers) {
                                    should.not.exist(err3);
                                    foundusers.length.should.be.equal(3);

                                    User.updateAll({}, {'$set': {age: 40}, age: 39}, function(err, updatedusers) {
                                        should.not.exist(err);
                                        updatedusers.should.have.property('count', 3);

                                        User.find({where:{age:40}},function(err2, foundusers) {
                                            should.not.exist(err2);
                                            foundusers.length.should.be.equal(3);

                                            User.find({where:{age:39}}, function(err3, foundusers) {
                                                should.not.exist(err3);
                                                foundusers.length.should.be.equal(0);

                                                done();
                                            });
                                        });
                                    });

                                });
                            });
                        });

                    });
                });
            });

        });

    });

    it('updateOrCreate should update the instance', function (done) {
        Post.create({title: 'a', content: 'AAA'}, function (err, post) {
            post.title = 'b';
            Post.updateOrCreate(post, function (err, p) {
                should.not.exist(err);
                p.id.should.be.equal(post.id);
                p.content.should.be.equal(post.content);
                should.not.exist(p._id);

                Post.findById(post.id, function (err, p) {
                    p.id.should.be.eql(post.id);
                    should.not.exist(p._id);
                    p.content.should.be.equal(post.content);
                    p.title.should.be.equal('b');

                    done();
                });
            });

        });
    });

    it('updateAttributes: $addToSet should append item to an Array if it doesn\'t already exist', function (done) {
        Product.dataSource.settings.allowExtendedOperators = true;
        Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90}]}, function (err, product) {

            var newattributes= {$set : {description:'goes well with butter'}, $addToSet : { pricehistory: { '2014-12-12':110 } } };

            product.updateAttributes(newattributes, function (err1, inst) {
                should.not.exist(err1);

                Product.findById(product.id, function (err2, updatedproduct) {
                    should.not.exist(err2);
                    should.not.exist(updatedproduct._id);
                    updatedproduct.id.should.be.eql(product.id);
                    updatedproduct.name.should.be.equal(product.name);
                    updatedproduct.description.should.be.equal('goes well with butter');
                    updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
                    updatedproduct.pricehistory[1]['2014-12-12'].should.be.equal(110);
                    done();
                });
            });
        });
    });

    it('updateOrCreate: $addToSet should append item to an Array if it doesn\'t already exist', function (done) {
        Product.dataSource.settings.allowExtendedOperators = true;
        Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90}]}, function (err, product) {

            product.$set = {description:'goes well with butter'};
            product.$addToSet = { pricehistory: { '2014-12-12':110 } };

            Product.updateOrCreate(product, function (err, updatedproduct) {
                should.not.exist(err);
                should.not.exist(updatedproduct._id);
                updatedproduct.id.should.be.eql(product.id);
                updatedproduct.name.should.be.equal(product.name);
                updatedproduct.description.should.be.equal('goes well with butter');
                updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
                updatedproduct.pricehistory[1]['2014-12-12'].should.be.equal(110);

                done();

            });
        });
    });


    it('updateOrCreate: $addToSet should not append item to an Array if it does already exist', function (done) {
        Product.dataSource.settings.allowExtendedOperators = true;
        Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90},{ '2014-10-10':80 }]}, function (err, product) {

            product.$set = {description:'goes well with butter'};
            product.$addToSet = { pricehistory: { '2014-10-10':80 } };

            Product.updateOrCreate(product, function (err, updatedproduct) {
                should.not.exist(err);
                should.not.exist(updatedproduct._id);
                updatedproduct.id.should.be.eql(product.id);
                updatedproduct.name.should.be.equal(product.name);
                updatedproduct.description.should.be.equal('goes well with butter');
                updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
                updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);

                done();

            });
        });
    });

    it('updateAttributes: $addToSet should not append item to an Array if it does already exist', function (done) {
        Product.dataSource.settings.allowExtendedOperators = true;
        Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90},{ '2014-10-10':80 }]}, function (err, product) {

            var newattributes= {$set : {description:'goes well with butter'}, $addToSet : { pricehistory: { '2014-12-12':110 } } };

            product.updateAttributes(newattributes, function (err1, inst) {
                should.not.exist(err1);

                Product.findById(product.id, function (err2, updatedproduct) {
                    should.not.exist(err2);
                    should.not.exist(updatedproduct._id);
                    updatedproduct.id.should.be.eql(product.id);
                    updatedproduct.name.should.be.equal(product.name);
                    updatedproduct.description.should.be.equal('goes well with butter');
                    updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
                    updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);
                    done();
                });
            });
        });
    });


    it('updateAttributes: $pop should remove first or last item from an Array', function (done) {
        Product.dataSource.settings.allowExtendedOperators = true;
        Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90},{'2014-10-10':80},{'2014-09-09':70}]}, function (err, product) {

            var newattributes= {$set : {description:'goes well with butter'}, $addToSet : { pricehistory: 1 } };

            product.updateAttributes(newattributes, function (err1, inst) {
                should.not.exist(err1);

                Product.findById(product.id, function (err2, updatedproduct) {
                    should.not.exist(err2);
                    should.not.exist(updatedproduct._id);
                    updatedproduct.id.should.be.eql(product.id);
                    updatedproduct.name.should.be.equal(product.name);
                    updatedproduct.description.should.be.equal('goes well with butter');
                    updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
                    updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);
                    done();
                });
            });
        });
    });

    it('updateOrCreate: $pop should remove first or last item from an Array', function (done) {
        Product.dataSource.settings.allowExtendedOperators = true;
        Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90},{'2014-10-10':80},{'2014-09-09':70}]}, function (err, product) {

            product.$set = {description:'goes well with butter'};
            product.$pop = { pricehistory: 1 };

            Product.updateOrCreate(product, function (err, updatedproduct) {
                should.not.exist(err);
                should.not.exist(updatedproduct._id);
                updatedproduct.id.should.be.eql(product.id);
                updatedproduct.name.should.be.equal(product.name);
                updatedproduct.description.should.be.equal('goes well with butter');
                updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
                updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);

                updatedproduct.$pop = { pricehistory: -1 };
                Product.updateOrCreate(product, function (err, p) {
                    should.not.exist(err);
                    should.not.exist(p._id);
                    updatedproduct.pricehistory[0]['2014-10-10'].should.be.equal(80);
                    done();
                });
            });
        });
    });

    it('updateAttributes: $pull should remove items from an Array if they match a criteria', function (done) {
        Product.dataSource.settings.allowExtendedOperators = true;
        Product.create({name: 'bread', price: 100, pricehistory:[70,80,90,100]}, function (err, product) {

            var newattributes= {$set : {description:'goes well with butter'}, $pull: { pricehistory: {$gte:90 } } };

            product.updateAttributes(newattributes, function (err1, updatedproduct) {
                should.not.exist(err1);
                Product.findById(product.id, function (err2, updatedproduct) {
                    should.not.exist(err1);
                    should.not.exist(updatedproduct._id);
                    updatedproduct.id.should.be.eql(product.id);
                    updatedproduct.name.should.be.equal(product.name);
                    updatedproduct.description.should.be.equal('goes well with butter');
                    updatedproduct.pricehistory[0].should.be.equal(70);
                    updatedproduct.pricehistory[1].should.be.equal(80);

                    done();
                });
            });
        });
    });

    it('updateOrCreate: $pull should remove items from an Array if they match a criteria', function (done) {
        Product.dataSource.settings.allowExtendedOperators = true;
        Product.create({name: 'bread', price: 100, pricehistory:[70,80,90,100]}, function (err, product) {

            product.$set = {description:'goes well with butter'};
            product.$pull = { pricehistory: {$gte:90 }};

            Product.updateOrCreate(product, function (err, updatedproduct) {
                should.not.exist(err);
                should.not.exist(updatedproduct._id);
                updatedproduct.id.should.be.eql(product.id);
                updatedproduct.name.should.be.equal(product.name);
                updatedproduct.description.should.be.equal('goes well with butter');
                updatedproduct.pricehistory[0].should.be.equal(70);
                updatedproduct.pricehistory[1].should.be.equal(80);

                done();
            });
        });
    });

    it('updateAttributes: $pullAll should remove items from an Array if they match a value from a list', function (done) {
        Product.dataSource.settings.allowExtendedOperators = true;
        Product.create({name: 'bread', price: 100, pricehistory:[70,80,90,100]}, function (err, product) {

            var newattributes= {$set : {description:'goes well with butter'}, $pullAll : { pricehistory: [80,100]} };

            product.updateAttributes(newattributes, function (err1, inst) {
                should.not.exist(err1);

                Product.findById(product.id, function (err2, updatedproduct) {
                    should.not.exist(err2);
                    should.not.exist(updatedproduct._id);
                    updatedproduct.id.should.be.eql(product.id);
                    updatedproduct.name.should.be.equal(product.name);
                    updatedproduct.description.should.be.equal('goes well with butter');
                    updatedproduct.pricehistory[0].should.be.equal(70);
                    updatedproduct.pricehistory[1].should.be.equal(90);

                    done();
                });

            });
        });
    });

    it('updateOrCreate: $pullAll should remove items from an Array if they match a value from a list', function (done) {
        Product.dataSource.settings.allowExtendedOperators = true;
        Product.create({name: 'bread', price: 100, pricehistory:[70,80,90,100]}, function (err, product) {

            product.$set = {description:'goes well with butter'};
            product.$pullAll = { pricehistory: [80,100]};

            Product.updateOrCreate(product, function (err, updatedproduct) {
                should.not.exist(err);
                should.not.exist(updatedproduct._id);
                updatedproduct.id.should.be.eql(product.id);
                updatedproduct.name.should.be.equal(product.name);
                updatedproduct.description.should.be.equal('goes well with butter');
                updatedproduct.pricehistory[0].should.be.equal(70);
                updatedproduct.pricehistory[1].should.be.equal(90);

                done();
            });
        });
    });


    it('updateAttributes: $push should append item to an Array even if it does already exist', function (done) {
        Product.dataSource.settings.allowExtendedOperators = true;
        Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90},{ '2014-10-10':80 }]}, function (err, product) {

            var newattributes= {$set : {description:'goes well with butter'}, $push : { pricehistory: { '2014-10-10':80 } } };

            product.updateAttributes(newattributes, function (err1, inst) {
                should.not.exist(err1);

                Product.findById(product.id, function (err2, updatedproduct) {
                    should.not.exist(err2);
                    should.not.exist(updatedproduct._id);
                    updatedproduct.id.should.be.eql(product.id);
                    updatedproduct.name.should.be.equal(product.name);
                    updatedproduct.description.should.be.equal('goes well with butter');
                    updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
                    updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);
                    updatedproduct.pricehistory[2]['2014-10-10'].should.be.equal(80);

                    done();
                });
            });
        });
    });

    it('updateOrCreate: $push should append item to an Array even if it does already exist', function (done) {
        Product.dataSource.settings.allowExtendedOperators = true;
        Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90},{ '2014-10-10':80 }]}, function (err, product) {

            product.$set = {description:'goes well with butter'};
            product.$push = { pricehistory: { '2014-10-10':80 } };

            Product.updateOrCreate(product, function (err, updatedproduct) {
                should.not.exist(err);
                should.not.exist(updatedproduct._id);
                updatedproduct.id.should.be.eql(product.id);
                updatedproduct.name.should.be.equal(product.name);
                updatedproduct.description.should.be.equal('goes well with butter');
                updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
                updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);
                updatedproduct.pricehistory[2]['2014-10-10'].should.be.equal(80);

                done();

            });
        });
    });

    it('updateOrCreate: should handle combination of operators and top level properties without errors', function (done) {
        Product.dataSource.settings.allowExtendedOperators = true;
        Product.create({name: 'bread', price: 100, ingredients:['flour'],pricehistory:[{'2014-11-11':90},{ '2014-10-10':80 }]}, function (err, product) {

            product.$set = {description:'goes well with butter'};
            product.$push = { ingredients: 'water' };
            product.$addToSet = { pricehistory: { '2014-09-09':70 } };
            product.description = 'alternative description';

            Product.updateOrCreate(product, function (err, updatedproduct) {
                should.not.exist(err);
                should.not.exist(updatedproduct._id);
                updatedproduct.id.should.be.eql(product.id);
                updatedproduct.name.should.be.equal(product.name);
                updatedproduct.description.should.be.equal('goes well with butter');
                updatedproduct.ingredients[0].should.be.equal('flour');
                updatedproduct.ingredients[1].should.be.equal('water');
                updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
                updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);
                updatedproduct.pricehistory[2]['2014-09-09'].should.be.equal(70);

                done();

            });
        });
    });


    it('updateOrCreate should update the instance without removing existing properties', function (done) {
        Post.create({title: 'a', content: 'AAA', comments: ['Comment1']}, function (err, post) {
            post = post.toObject();
            delete post.title;
            delete post.comments;
            Post.updateOrCreate(post, function (err, p) {
                should.not.exist(err);
                p.id.should.be.equal(post.id);
                p.content.should.be.equal(post.content);
                should.not.exist(p._id);

                Post.findById(post.id, function (err, p) {
                    p.id.should.be.eql(post.id);
                    should.not.exist(p._id);
                    p.content.should.be.equal(post.content);
                    p.title.should.be.equal('a');
                    p.comments[0].should.be.equal('Comment1');

                    done();
                });
            });

        });
    });

    it('updateOrCreate should create a new instance if it does not exist', function (done) {
        var post = {id: '123', title: 'a', content: 'AAA'};
        Post.updateOrCreate(post, function (err, p) {
            should.not.exist(err);
            p.title.should.be.equal(post.title);
            p.content.should.be.equal(post.content);
            p.id.should.be.eql(post.id);

            Post.findById(p.id, function (err, p) {
                p.id.should.be.equal(post.id);
                should.not.exist(p._id);
                p.content.should.be.equal(post.content);
                p.title.should.be.equal(post.title);
                p.id.should.be.equal(post.id);

                done();
            });
        });

    });

    it('save should update the instance with the same id', function (done) {
        Post.create({title: 'a', content: 'AAA'}, function (err, post) {
            post.title = 'b';
            post.save(function (err, p) {
                should.not.exist(err);
                p.id.should.be.equal(post.id);
                p.content.should.be.equal(post.content);
                should.not.exist(p._id);

                Post.findById(post.id, function (err, p) {
                    p.id.should.be.eql(post.id);
                    should.not.exist(p._id);
                    p.content.should.be.equal(post.content);
                    p.title.should.be.equal('b');

                    done();
                });
            });

        });
    });

    it('save should update the instance without removing existing properties', function (done) {
        Post.create({title: 'a', content: 'AAA'}, function (err, post) {
            delete post.title;
            post.save(function (err, p) {
                should.not.exist(err);
                p.id.should.be.equal(post.id);
                p.content.should.be.equal(post.content);
                should.not.exist(p._id);

                Post.findById(post.id, function (err, p) {
                    p.id.should.be.eql(post.id);
                    should.not.exist(p._id);
                    p.content.should.be.equal(post.content);
                    p.title.should.be.equal('a');

                    done();
                });
            });

        });
    });

    it('save should create a new instance if it does not exist', function (done) {
        var post = new Post({id: '123', title: 'a', content: 'AAA'});
        post.save(post, function (err, p) {
            should.not.exist(err);
            p.title.should.be.equal(post.title);
            p.content.should.be.equal(post.content);
            p.id.should.be.equal(post.id);

            Post.findById(p.id, function (err, p) {
                p.id.should.be.equal(post.id);
                should.not.exist(p._id);
                p.content.should.be.equal(post.content);
                p.title.should.be.equal(post.title);
                p.id.should.be.equal(post.id);

                done();
            });
        });

    });
    it('all should return object with an id, which is instanceof ObjectID, but not mongodb _id', function (done) {
        var post = new Post({title: 'a', content: 'AAA'})
        post.save(function (err, post) {
            Post.all({where: {title: 'a'}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.lengthOf(1);
                post = posts[0];
                post.should.have.property('title', 'a');
                post.should.have.property('content', 'AAA');
                post.id.should.be.an.instanceOf(db.ObjectID);
                should.not.exist(post._id);

                done();
            });

        });
    });

    it('all return should honor filter.fields', function (done) {
        var post = new Post({title: 'b', content: 'BBB'})
        post.save(function (err, post) {
            Post.all({fields: ['title'], where: {title: 'b'}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.lengthOf(1);
                post = posts[0];
                post.should.have.property('title', 'b');
                post.should.have.property('content', undefined);
                should.not.exist(post._id);
                should.not.exist(post.id);

                done();
            });

        });
    });

    it('create should convert id from string to ObjectID if format matches',
    function (done) {
        var oid = new db.ObjectID().toString();
        PostWithStringId.create({id: oid, title: 'c', content: 'CCC'}, function (err, post) {
            PostWithStringId.findById(oid, function (err, post) {
                should.not.exist(err);
                should.not.exist(post._id);
                post.id.should.be.equal(oid);

                done();
            });
        });
    });

    it('find should order by id if the order is not set for the query filter',
    function (done) {
        PostWithStringId.create({id: '2', title: 'c', content: 'CCC'}, function (err, post) {
            PostWithStringId.create({id: '1', title: 'd', content: 'DDD'}, function (err, post) {
                PostWithStringId.find(function (err, posts) {
                    should.not.exist(err);
                    posts.length.should.be.equal(2);
                    posts[0].id.should.be.equal('1');

                    PostWithStringId.find({limit: 1, offset: 0}, function (err, posts) {
                        should.not.exist(err);
                        posts.length.should.be.equal(1);
                        posts[0].id.should.be.equal('1');

                        PostWithStringId.find({limit: 1, offset: 1}, function (err, posts) {
                            should.not.exist(err);
                            posts.length.should.be.equal(1);
                            posts[0].id.should.be.equal('2');
                            done();
                        });
                    });
                });
            });
        });
    });

    it('should report error on duplicate keys', function (done) {
        Post.create({title: 'd', content: 'DDD'}, function (err, post) {
            Post.create({id: post.id, title: 'd', content: 'DDD'}, function (err, post) {
                should.exist(err);
                done();
            });
        });
    });

    it('should allow to find using like', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {title: {like: 'M.+st'}}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 1);
                done();
            });
        });
    });

    it('should allow to find using case insensitive like', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {title: {like: 'm.+st', options: 'i'}}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 1);
                done();
            });
        });
    });

    it('should allow to find using case insensitive like', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {content: {like: 'HELLO', options: 'i'}}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 1);
                done();
            });
        });
    });

    it('should support like for no match', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {title: {like: 'M.+XY'}}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 0);
                done();
            });
        });
    });

    it('should allow to find using nlike', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {title: {nlike: 'M.+st'}}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 0);
                done();
            });
        });
    });

    it('should allow to find using case insensitive nlike', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {title: {nlike: 'm.+st', options: 'i'}}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 0);
                done();
            });
        });
    });

    it('should support nlike for no match', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {title: {nlike: 'M.+XY'}}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 1);
                done();
            });
        });
    });

    it('should support "and" operator that is satisfied', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {and: [{title: 'My Post'}, {content: 'Hello'}]}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 1);
                done();
            });
        });
    });

    it('should support "and" operator that is not satisfied', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {and: [{title: 'My Post'}, {content: 'Hello1'}]}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 0);
                done();
            });
        });
    });

    it('should support "or" that is satisfied', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {or: [{title: 'My Post'}, {content: 'Hello1'}]}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 1);
                done();
            });
        });
    });

    it('should support "or" operator that is not satisfied', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {or: [{title: 'My Post1'}, {content: 'Hello1'}]}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 0);
                done();
            });
        });
    });

    it('should support "nor" operator that is satisfied', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {nor: [{title: 'My Post1'}, {content: 'Hello1'}]}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 1);
                done();
            });
        });
    });

    it('should support "nor" operator that is not satisfied', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {nor: [{title: 'My Post'}, {content: 'Hello1'}]}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 0);
                done();
            });
        });
    });

    it('should support neq for match', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {title: {neq: 'XY'}}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 1);
                done();
            });
        });
    });

    it('should support neq for no match', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.find({where: {title: {neq: 'My Post'}}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.property('length', 0);
                done();
            });
        });
    });

    // The where object should be parsed by the connector
    it('should support where for count', function (done) {
        Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
            Post.count({and: [{title: 'My Post'}, {content: 'Hello'}]}, function (err, count) {
                should.not.exist(err);
                count.should.be.equal(1);
                Post.count({and: [{title: 'My Post1'}, {content: 'Hello'}]}, function (err, count) {
                    should.not.exist(err);
                    count.should.be.equal(0);
                    done();
                });
            });
        });
    });

    // The where object should be parsed by the connector
    it('should support where for destroyAll', function (done) {
        Post.create({title: 'My Post1', content: 'Hello'}, function (err, post) {
            Post.create({title: 'My Post2', content: 'Hello'}, function (err, post) {
                Post.destroyAll({and: [
                    {title: 'My Post1'},
                    {content: 'Hello'}
                ]}, function (err) {
                    should.not.exist(err);
                    Post.count(function (err, count) {
                        should.not.exist(err);
                        count.should.be.equal(1);
                        done();
                    });
                });
            });
        });
    });

    // after(function (done) {
    //     User.destroyAll(function () {
    //         Post.destroyAll(function () {
    //             PostWithObjectId.destroyAll(function () {
    //                 PostWithNumberId.destroyAll(function () {
    //                     PostWithNumberUnderscoreId.destroyAll(done);
    //                 });
    //             });
    //         });
    //     });
    // });
});
