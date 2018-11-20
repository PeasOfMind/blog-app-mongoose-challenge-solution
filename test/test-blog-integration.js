'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const { BlogPost } = require('../models');
const {TEST_DATABASE_URL} = require('../config');
const {app, runServer, closeServer } = require('../server');

chai.use(chaiHttp);

//generates a random blogpost using faker
function generateBlogPost(){
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: faker.random.words(),
        content: faker.lorem.paragraph(),
    }
}

//generate 10 random blogposts to start the database with
function seedBlogData(){
    console.info('seeding blog data');
    const seedData = [];
    for(let i = 1; i<=10; i++){
        seedData.push(generateBlogPost());
    }
    return BlogPost.insertMany(seedData);
}

function tearDownDb(){
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blogpost API resource', function() {

    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function(){
        return seedBlogData();
    });

    afterEach(function(){
        return tearDownDb();
    });

    after(function(){
        return closeServer();
    });

    describe('GET endpoint', function() {
        it('should return all existing blog posts', function(){
            let res;
            return chai.request(app)
            .get('/posts')
            .then(function(_res){
                res = _res;
                //check that status is correct
                expect(res).to.have.status(200);
                //check that at least one entry is present (seeding worked)
                expect(res.body).to.have.lengthOf.at.least(1);
                return BlogPost.count();
            })
            .then(function(count){
                //check that all entries are present
                expect(res.body).to.have.lengthOf(count);
            });
        });

        it('should return blog posts with the right fields', function(){
            let resBlog;
            return chai.request(app)
            .get('/posts')
            .then(function(res){
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.a('array');
                expect(res.body).to.have.lengthOf.at.least(1);

                res.body.forEach(function(post){
                    expect(post).to.be.a('object');
                    expect(post).to.include.keys('id', 'author', 'title', 'content', 'created')
                });

                resBlog = res.body[0];
                return BlogPost.findById(resBlog.id);
            })
            .then(function(post){
                expect(resBlog.id).to.equal(post.id);
                expect(resBlog.author).to.equal(`${post.author.firstName} ${post.author.lastName}`);
                expect(resBlog.title).to.equal(post.title);
                expect(resBlog.content).to.equal(post.content);
                // expect(resBlog.created.toDateString()).to.equal(post.created.toDateString());
            });
        });
    });

    describe('GET by id endpoint', function(){
        it('should return the requested blog post', function(){
            let resBlog;
            return BlogPost
            .findOne()
            .then(function(post){
                resBlog = post;

                return chai.request(app)
                .get(`/posts/${resBlog.id}`)
            })
            .then(function(res){
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.a('object');
                expect(res.body.id).to.equal(resBlog.id);
                expect(res.body.author).to.equal(`${resBlog.author.firstName} ${resBlog.author.lastName}`);
                expect(res.body.title).to.equal(resBlog.title);
                expect(res.body.content).to.equal(resBlog.content);
                // expect(res.body.created).to.equal(resBlog.created);
            });
        });
    });

    describe('POST endpoint', function(){
        it('should add a new blog post', function(){

            const newPost = generateBlogPost();

            return chai.request(app)
            .post('/posts')
            .send(newPost)
            .then(function(res){
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.be.a('object');
                expect(res.body).to.include.keys('id', 'author', 'title', 'content', 'created');
                expect(res.body.id).to.be.a('string');
                expect(res.body.author).to.equal(`${newPost.author.firstName} ${newPost.author.lastName}`);
                expect(res.body.title).to.equal(newPost.title);
                expect(res.body.content).to.equal(newPost.content);
            });
        });
    });

    describe('PUT endpoint', function(){
        it('should update fields you send over', function(){
            const updateData = {
                title: 'The origin of foo bar',
                content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse gravida aliquet metus, non vehicula est blandit eget. Nunc ultrices dapibus enim et suscipit. Fusce sapien leo, iaculis eu luctus vitae, pellentesque non enim. Nam quis sem nec velit imperdiet dictum sit amet in neque. Vivamus vel sagittis orci, at varius elit. Phasellus nec lorem sit amet urna egestas faucibus ac et purus. Sed semper dictum neque, at posuere leo tempor id. Proin imperdiet odio nec justo tincidunt hendrerit. Duis dapibus elit a dignissim lacinia. Ut tincidunt massa quis neque bibendum, ac aliquet dolor interdum. Suspendisse placerat enim sit amet lectus tristique ultricies. Nunc a placerat nibh. Ut ut arcu viverra, luctus enim et, condimentum tellus. Mauris in egestas magna.'
            };

            return BlogPost
            .findOne()
            .then(function(post){
                updateData.id = post.id;

                return chai.request(app)
                .put(`/posts/${updateData.id}`)
                .send(updateData);
            })
            .then(function(res){
                expect(res).to.have.status(204);

                return BlogPost.findById(updateData.id);
            })
            .then(function(post){
                expect(post.title).to.equal(updateData.title);
                expect(post.content).to.equal(updateData.content);
            });
        });
    });

    describe('DELETE endpoint', function(){
        it('deletes a blog post by id', function(){
            let post;

            return BlogPost
            .findOne()
            .then(function(_post){
                post = _post;
                return chai.request(app).delete(`posts/${post.id}`);
            })
            .then(function(res){
                expect(res).to.have.status(204);
                return BlogPost.findById(post.id);
            })
            .then(function(_post){
                expect(_post).to.be.null;
            });
        });
    });

})