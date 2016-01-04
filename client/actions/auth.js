import jwtDecode from 'jwt-decode';
import { pushPath } from 'redux-simple-router';

import * as constants from '../constants';

const lock = new Auth0Lock('6H7zPf1rXmATxqYU9S4ixGV3Fbmoe5u0', 'sandrino.auth0.com');

export function login(returnUrl) {
  lock.show({
    closable: false,
    responseType: 'token',
    callbackURL: 'http://localhost:3001/login',
    callbackOnLocationHash: true,
    authParams: {
      state: returnUrl
    }
  });

  return {
    type: constants.SHOW_LOGIN
  };
}

export function logout() {
  return (dispatch) => {
    localStorage.removeItem('userToken');

    dispatch({
      type: constants.LOGOUT_SUCCESS
    });
  };
}

export function loadCredentials() {
  return (dispatch) => {
    if (window.location.hash) {
      const hash = lock.parseHash(window.location.hash);
      if (hash && hash.id_token) {
        dispatch({
          type: constants.RECIEVED_TOKEN,
          payload: {
            id_token: hash.id_token
          }
        });

        dispatch({
          type: constants.LOGIN_PENDING
        });

        lock.$auth0.getProfile(hash.id_token, (err, profile) => {
          if (err) {
            return dispatch({
              type: constants.LOGIN_FAILED,
              payload: {
                error: err.message
              }
            });
          }

          localStorage.setItem('userToken', hash.id_token);
          localStorage.setItem('userProfile', JSON.stringify(profile));

          dispatch({
            type: constants.LOGIN_SUCCESS,
            payload: {
              id_token: hash.id_token,
              user: profile
            }
          });

          if (hash.state) {
            dispatch(pushPath(hash.state));
          }
        });

        return;
      }
    }

    const id_token = localStorage.getItem('userToken');
    const profile = localStorage.getItem('userProfile');
    if (id_token && profile) {
      const decodedToken = jwtDecode(id_token);
      if (isExpired(decodedToken)) {
        return;
      }

      dispatch({
        type: constants.LOADED_TOKEN,
        payload: {
          id_token
        }
      });

      dispatch({
        type: constants.LOGIN_SUCCESS,
        payload: {
          id_token,
          user: JSON.parse(profile)
        }
      });
      return;
    }
  };
}

function isExpired(decodedToken) {
  if(typeof decodedToken.exp === 'undefined') {
    return true;
  }

  let d = new Date(0);
  d.setUTCSeconds(decodedToken.exp);

  return !(d.valueOf() > (new Date().valueOf() + (1000)));
}
