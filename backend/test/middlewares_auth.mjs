import { expect } from 'chai';
import auth from '../middlewares/auth.js';
import jwt from 'jsonwebtoken';
import sinon from 'sinon';

describe('Auth Middleware', () => {
    it('should throw an error if no header is present', function() {
        const req = {
            get: function(headerName) {
                return null;
            }
        };
    
        expect(auth.bind(this, req, {}, () => {})).to.throw('Not authenticated.');
    });
    
    it('should throw an error token is only one string', function() {
        const req = {
            get: function(headerName) {
                return 'some-auth-header-value';
            }
        };
    
        expect(auth.bind(this, req, {}, () => {})).to.throw();
    });

    it('should yield a userId after decoding the token', function() {
        const req = {
            get: function(headerName) {
                return 'Bearer some-auth-header-value';
            }
        };
        sinon.stub(jwt, 'verify');
        jwt.verify.returns({ userId: 'some-user-id' });
        auth(req, {}, () => {});
        expect(req).to.have.property('userId', 'some-user-id');
        expect(jwt.verify.called).to.be.true;
        jwt.verify.restore();
    });

    it('should throw an error if token cannot be verified', function() {
        const req = {
            get: function(headerName) {
                return 'Bearer some-auth-header-value';
            }
        };
    
        expect(auth.bind(this, req, {}, () => {})).to.throw();
    });
    
});