var dotenv = require('dotenv');
var express = require("express");
var exphbs = require("express-handlebars");
const mercadopago = require("mercadopago");
const fetch = require('node-fetch');

var app = express();
global.asd = 'Hola'

dotenv.config();

mercadopago.configure({
  access_token: process.env.ACCESS_TOKEN
});

app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/detail", function(req, res) {
  const { title, price, unit, img } = req.query;
  let preference = {
    items: [
        {
            id : "1234",
            title: title,
            descrption: "Dispositivo móvil de Tienda e-commerce",
            picture_url: img,
            unit_price: parseFloat(price),
            quantity: parseInt(unit)
        }
    ],
    back_urls: {
        "success": req.protocol + '://' + req.get('host') + '/success',
        "pending": req.protocol + '://' + req.get('host') + '/pending',
        "failure": req.protocol + '://' + req.get('host') + '/failure'
    },
    payer: {
        "name": "Lalo",
        "surname": "Landa",
        "identification": {
            "type" : "DNI",
            "number" : "22333444"
        },
        "email" : "test_user_63274575@testuser.com",
        "phone": {
            "area_code": "011",
            "number": 22223333
        },
        "address": {
            "street_name": "Falsa",
            "street_number": 123,
            "zip_code": "1111"
        }
    },
    payment_methods: {
        excluded_payment_methods: [
          { id: "amex" }
        ],
        excluded_payment_types: [
          { id: "atm" }
        ],
        installments: 6
     },
    external_reference: "ABCD1234",
    notification_url: req.protocol + '://' + req.get('host') + '/notifications',
    auto_return:"approved"
  };

  mercadopago.preferences.create(preference)
    .then(resp => {
      global.init_point = resp.body.init_point;
      console.log(global.init_point);
      global.asd = resp.body.id;
      res.render("detail", {
        img,
        price,
        title,
        unit,
        id: resp.body.id
      });
    })
    .catch(err => console.log(err));
});

app.post('/procesar-pago', (req, res) => {

  fetch('https://api.mercadopago.com/merchant_orders/search?access_token='+process.env.ACCESS_TOKEN+'&preference_id='+global.asd)
    .then(res => res.json())
    .then(json => {

      let status = json.elements[0].payments[0].status;
      console.log(status);
      switch(status) {
        case 'pending':
          res.render("pending");
          break;
        case 'approved':
          var id = json.elements[0].payments[0].id
          mercadopago.payment.get(id).then(function (data) {
            var payment_method_id = data.body.payment_method_id
            var transaction_amount = data.body.transaction_amount
            var order_id = data.body.order.id
            res.render('success', {
              id,
              payment_method_id,
              transaction_amount,
              order_id
            });
          })
          break;
        case 'failure':
          res.render("failure");
          break;
        default:
          res.status(500).json('Error-Guardado')
      }
    });
})

app.get('/', function (req, res) {
  res.render('home');
});

app.get('/failure', function (req, res) {
  res.render('failure');
});

app.get('/pending', function (req, res) {
  res.render('pending');
});

app.get('/success', function (req, res) {
    var id = req.query.collection_id
    mercadopago.payment.get(id).then(function (data) {
      var payment_method_id = data.body.payment_method_id
      var transaction_amount = data.body.transaction_amount
      var order_id = data.body.order.id
      res.render('success', {
        id,
        payment_method_id,
        transaction_amount,
        order_id
      });
    })

});

app.post('/notifications', async(req, res)=>{
  
    const body = req.body;
    console.log("Maldo-Data-notifications")
    console.log(req.query);
    res.status(200).json('OK')
})

app.use(express.static("assets"));

app.use("/assets", express.static(__dirname + "/assets"));

app.listen(process.env.PORT || 3000);