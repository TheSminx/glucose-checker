var Alexa = require('ask-sdk-core');
var axios = require('axios');
var crypto = require('crypto');

var LIBRE_EMAIL    = process.env.LIBRE_EMAIL    || 'your-email@example.com';
var LIBRE_PASSWORD = process.env.LIBRE_PASSWORD || 'your-password';

var BASE_URL = 'https://api-eu.libreview.io';

var TREND_TEXT = {
  1: 'in rapida discesa',
  2: 'in discesa',
  3: 'stabile',
  4: 'in salita',
  5: 'in rapida salita'
};

function getHeaders(token, accountId) {
  var h = {
    'Content-Type':    'application/json',
    'Accept':          'application/json',
    'Accept-Encoding': 'gzip',
    'product':         'llu.android',
    'version':         '4.16.0',
    'cache-control':   'no-cache',
    'connection':      'Keep-Alive'
  };
  if (token) {
    h['Authorization'] = 'Bearer ' + token;
  }
  if (accountId) {
    h['account-id'] = crypto.createHash('sha256').update(accountId).digest('hex');
  }
  return h;
}

function getGlucoseData() {
  var token;
  var patientId;
  var accountId;

  return axios.post(
    BASE_URL + '/llu/auth/login',
    { email: LIBRE_EMAIL, password: LIBRE_PASSWORD },
    { headers: getHeaders(null, null) }
  )
  .then(function(loginRes) {
    if (loginRes.data && loginRes.data.data && loginRes.data.data.redirect) {
      var newRegion = loginRes.data.data.region;
      BASE_URL = 'https://api-' + newRegion + '.libreview.io';
      return axios.post(
        BASE_URL + '/llu/auth/login',
        { email: LIBRE_EMAIL, password: LIBRE_PASSWORD },
        { headers: getHeaders(null, null) }
      );
    }
    return loginRes;
  })
  .then(function(loginRes) {
    token     = loginRes.data && loginRes.data.data && loginRes.data.data.authTicket && loginRes.data.data.authTicket.token;
    accountId = loginRes.data && loginRes.data.data && loginRes.data.data.user && loginRes.data.data.user.id;
    if (!token) {
      throw new Error('Token mancante. Risposta: ' + JSON.stringify(loginRes.data).substring(0, 200));
    }
    if (!accountId) {
      throw new Error('AccountId mancante. Risposta: ' + JSON.stringify(loginRes.data).substring(0, 200));
    }
    return axios.get(
      BASE_URL + '/llu/connections',
      { headers: getHeaders(token, accountId) }
    )
    .catch(function(connErr) {
      var body = connErr.response && connErr.response.data ? JSON.stringify(connErr.response.data).substring(0, 300) : 'nessun body';
      throw new Error('403 connections. Body: ' + body);
    });
  })
  .then(function(connRes) {
    var data = connRes.data && connRes.data.data;
    patientId = data && data[0] && data[0].patientId;
    if (!patientId) {
      throw new Error('Nessun sensore collegato');
    }
    return axios.get(
      BASE_URL + '/llu/connections/' + patientId + '/graph',
      { headers: getHeaders(token, accountId) }
    );
  })
  .then(function(graphRes) {
    var d = graphRes.data && graphRes.data.data;
    var measurement = d && d.connection && d.connection.glucoseMeasurement;
    var graphData   = (d && d.graphData) || [];
    if (!measurement) {
      throw new Error('Nessuna misurazione disponibile');
    }
    return { measurement: measurement, graphData: graphData };
  });
}

// ── LAUNCH ───────────────────────────────────────────────────────────────────
var LaunchRequestHandler = {
  canHandle: function(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'LaunchRequest';
  },
  handle: function(h) {
    return h.responseBuilder
      .speak('Ciao! Puoi chiedermi la tua glicemia attuale oppure lo storico delle ultime ore.')
      .reprompt('Dimmi: qual e la mia glicemia?')
      .getResponse();
  }
};

// ── GLICEMIA ATTUALE ─────────────────────────────────────────────────────────
var GetCurrentGlucoseIntentHandler = {
  canHandle: function(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(h.requestEnvelope) === 'CurrentGlucoseIntent';
  },
  handle: function(h) {
    return getGlucoseData()
      .then(function(result) {
        var m     = result.measurement;
        var value = m.Value;
        var trend = TREND_TEXT[m.TrendArrow] || '';
        var alert = '';
        if (m.isHigh) { alert = 'Attenzione, valore alto! '; }
        if (m.isLow)  { alert = 'Attenzione, valore basso! '; }

        var speech = alert + 'La tua glicemia e ' + value + ' milligrammi per decilitro, ' + trend + '.';

        return h.responseBuilder.speak(speech).getResponse();
      })
      .catch(function(err) {
        console.error('Errore glicemia:', err.message);
        var msg    = err.message || 'errore sconosciuto';
        var status = err.response && err.response.status ? err.response.status : 'nessuno';
        var url    = err.config && err.config.url ? err.config.url : 'url sconosciuto';
        return h.responseBuilder
          .speak('Errore: ' + msg + '. Stato HTTP: ' + status + '. URL: ' + url)
          .getResponse();
      });
  }
};

// ── STORICO ───────────────────────────────────────────────────────────────────
var GetGlucoseHistoryIntentHandler = {
  canHandle: function(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(h.requestEnvelope) === 'TrendIntent';
  },
  handle: function(h) {
    return getGlucoseData()
      .then(function(result) {
        var graphData = result.graphData;
        if (!graphData.length) {
          return h.responseBuilder.speak('Non ho trovato misurazioni recenti.').getResponse();
        }
        var values = graphData.map(function(r) { return r.Value; });
        var sum    = values.reduce(function(a, b) { return a + b; }, 0);
        var avg    = Math.round(sum / values.length);
        var min    = Math.min.apply(null, values);
        var max    = Math.max.apply(null, values);

        var speech = 'Nelle ultime ore hai avuto una glicemia media di ' + avg + ', con un minimo di ' + min + ' e un massimo di ' + max + ' milligrammi per decilitro.';

        return h.responseBuilder.speak(speech).getResponse();
      })
      .catch(function(err) {
        console.error('Errore storico:', err.message);
        return h.responseBuilder
          .speak('Non riesco a recuperare lo storico in questo momento.')
          .getResponse();
      });
  }
};

// ── HELP / STOP / ERROR ───────────────────────────────────────────────────────
var HelpIntentHandler = {
  canHandle: function(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle: function(h) {
    return h.responseBuilder
      .speak('Puoi chiedermi: qual e la mia glicemia, oppure: dimmi lo storico glicemico.')
      .reprompt('Come posso aiutarti?')
      .getResponse();
  }
};

var CancelAndStopIntentHandler = {
  canHandle: function(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
      && (Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.CancelIntent'
       || Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle: function(h) {
    return h.responseBuilder.speak('A presto!').getResponse();
  }
};

var ErrorHandler = {
  canHandle: function() { return true; },
  handle: function(h, err) {
    console.error('Errore generico:', err);
    return h.responseBuilder.speak('Si e verificato un errore. Riprova.').getResponse();
  }
};

// ── EXPORT ────────────────────────────────────────────────────────────────────
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    GetCurrentGlucoseIntentHandler,
    GetGlucoseHistoryIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
