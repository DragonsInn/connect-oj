var coj = require("./main");
var connect = require("connect");
var app = connect();

app.use("/", coj({}));

app.listen(9900);
