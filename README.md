# connect-oj: A unique way to use oj

So, you are working on a project with some rather long function calls? Then you probably have seen something like this:

    inst.func(myVar, "some text", true, 20, 20, null);

.... Whaaaaaaat? 0_o

The solution usually is to use better documentation. But, it could be easier:

    [inst func:myVar
          withStringData:"some text"
          someBool:true
          height:20
          width:20
          extraData:null
    ];

No documentation needed. AND you may even have "various definitions":

    [inst method:1 andString:"2"];
    [inst method:1];

Now, that's what I call code readability. But oj itself lacks a preprocessor, so I put a tiny one to the job. Now, maybe you built your own little foundation of most-used classes and such. Here are two ways to use connect-oj:

### myfile.oj:
```objective-c
#include("MyFoundation/file.oj");
@implementation somethingCool: MyBase
+(id)initializeWith:(MyObj)obj {...}
-(BOOL)doSomeWork {
    // Some long and heavy work goes here.
}
@end

// Now, somewhere within your code:
var myModule = {
    someFunction: function() {
        var myVar;
        // Evaluate some data...
        inst = [somethingCool initializeWith:this];
        [inst doSomeWork];
    }
}
```

In the above example, we created a - rather minimalistic - file, that included a "foundation" file and then used it. But, what if you only wanted readable code  for internal stuff, and export simpler stuff to the user - or other scripts already in a site?

### otherFile.oj
```objective-c
@implementation Internal
// ...
@end

function myExport(arg) {
    var me;
    me.__inst = [[Internal alloc] init];
    me.myFunc = function() {
        return [this.__inst myFunc];
    }
    me.otherFunc = function(a, b, c, ...) {
        return [this.__inst otherFunc:a and:b andAso:c ...];
    }
}
```

When you request a .oj file, it will be preprocessed and saved as .js - then served. You can also create a .d file with the same name as an .oj file - or one that might be requested. The .d file is a JSON object:

```json
{
    "files": ["myfile.oj", "myotherfile.oj"]
}
```

Now, the following scheme might happen:

- Client requests mysite.oj
- Server finds mysite.oj and mysite.js does not exist:
    * Preprocesses it
    * Hands preprocessed output to oj
    * oj compiles it
    * output is saved to .js file
* Server finds mysite.oj and mysite.js exists:
    * Compare the timestamps. If mysite.oj is newer than mysite.js, repeat above condition, but rewrite the .js
* Server DOES NOT find mysite.oj BUT mysite.d:
    * Open the .d file, parse the JSON inside
    * Concat all the listed input files together
    * Preprocess, compile and save the output
    * If the output - in this case, mysite.js - already exists, see if any of the input files have changed - by timestamp - and if they did, update the output


The .d is taken from compiling native code, and means "dependencies".

## Using the preprocessor
You may have a set of include-able files. You can bind them in using the pre-processor. Here is how that could look like:

```objective-c
#include("Helpers.oj");
#include("Defs.oj");

#if(needsBase) {
@implementation MyObject : base
#} else {
@implementation MyObject
#}
+(BOOL)amICool { return false; }
@end
```

The preprocessor is actually JavaScript. See `pp.js` to see this mini preprocessor. It basically just uses the integrated `vm` module to run a preprocessor.
This trick makes things very easy, and the preprocessor may also learn new tricks such as include paths and such in the future.

## How to use
```javascript
var coj = require("connect-oj");
app.use(coj({...options...}));
```

## Options
The options object can be a bit cumbersome, since oj and preproc both can receive options. Therefore, its actually split:

```JavaScript
var options = {
    oj: {
        // oj options go here
    },
    alwaysSaveOutput: true, // Do we want to save processed scripts?
    usePreprocessor: true // If disabled, you may get a speed-gain.
};
```

To see `oj` options, head to [the offical OJ repo](https://github.com/musictheory/oj/tree/1.0).
