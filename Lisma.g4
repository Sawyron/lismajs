grammar Lisma;
prog: state+ EOF;
state:
	'state' ID LPAREN expr RPAREN LBRACKET statement* RBRACKET 'from' ID (
		',' ID
	)*;
statement: (diff_def | alg_def) DELIMITER;
diff_def: ID '\'' '=' expr;
alg_def: ID '=' expr;
expr:
	expr BIN_OP expr
	| ID LPAREN (expr (',' expr+)*)? RPAREN
	| L_UN_OP expr
	| LPAREN expr RPAREN
	| ID
	| NUMBER;
ID: [a-zA-Z_$]([a-zA-Z_$0-9])*;
BIN_OP:
	SIGN
	| '*'
	| '/'
	| '&&'
	| '||'
	| '^'
	| '=='
	| '!='
	| '<'
	| '<='
	| '>'
	| '>=';
SIGN: '+' | '-';
L_UN_OP: '!' | SIGN;
LPAREN: '(';
RPAREN: ')';
LBRACKET: '{';
RBRACKET: '}';
FORMAT: [\r\n\t ]+ -> skip;
DELIMITER: ';';
NUMBER: SIGN? [0-9]+ ('.' [0-9]+)?;