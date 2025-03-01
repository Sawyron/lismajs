grammar Lisma;
prog: topLevelStatement+ EOF;
topLevelStatement: state | constDef;
state:
	'state' ID LPAREN expr RPAREN LBRACKET statement* RBRACKET 'from' ID (
		',' ID
	)*;
statement: (diffDef | algDef | initCond) DELIMITER;
diffDef: ID '\'' '=' expr;
algDef: ID '=' expr;
initCond: ID '(' 't0' ')' '=' expr;
constDef: 'const' ID '=' expr DELIMITER;
expr:
	expr BIN_OP expr
	| ID LPAREN expr (',' expr+)* RPAREN
	| ID LPAREN RPAREN
	| L_UN_OP expr
	| LPAREN expr RPAREN
	| ID
	| NUMBER;
ID: [a-zA-Z_$]([a-zA-Z_$0-9])*;
fragment SIGN: '+' | '-';
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
L_UN_OP: '!' | SIGN;
LPAREN: '(';
RPAREN: ')';
LBRACKET: '{';
RBRACKET: '}';
DELIMITER: ';';
NUMBER: SIGN? [0-9]+ ('.' [0-9]+)?;
FORMAT: [\r\n\t ]+ -> skip;