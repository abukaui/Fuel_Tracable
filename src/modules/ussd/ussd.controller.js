'use strict';

const service = require('./ussd.service');

async function handleCallback(req, res, next) {
  try {
    const { sessionId, phoneNumber, text } = req.body;
    
    // USSD callback from Africa's Talking expects plain text response
    const responseText = await service.handleCallback({
      sessionId,
      phoneNumber,
      text: text || ''
    });

    res.set('Content-Type', 'text/plain');
    res.send(responseText);
  } catch (err) {
    console.error('[ussd] Unhandled error in callback:', err);
    res.set('Content-Type', 'text/plain');
    res.send('END An internal error occurred. Please try again later.');
  }
}

module.exports = {
  handleCallback
};
