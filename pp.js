var fs = require( 'fs' );
var myVM = require( 'vm' );
var path = require( 'path' );

module.exports = function Preprocessor(fileName) {
    var file = fs.readFileSync( fileName ).toString( );
    var baseDir = path.dirname(fileName);
    var lines = file.split('\n');
    var skipped = '';
    var code = [ ];
    var result;

    for( var ln in lines ) {
        var line = lines[ ln ];

        if( line[ 0 ] === '#' ) {
            lines[ ln ] = line.substr( 1 );
            skipped += '\\n';
        } else {
            lines[ ln ] =
                'code.push("' + skipped
                + line.replace( /\"/g, '\\"' )
                      //.replace( /"/g, '\\"' )
                + '");';
                skipped = '';
        }
    }

    // "return" the finalized bit of code.
    lines.push( 'code; ');

    result = myVM.runInNewContext(
        lines.join( '\n' ),
    	{
    		code : code,
    		require : require,
    		include : function( filename ) {
    			code.push( Preprocessor( filename ) );
    		}
    	}
    ).join('\n');

    return result;
}
