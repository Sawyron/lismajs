grammar Lisma;
prog: topLevelStatement+ EOF;
topLevelStatement: constDef | state;
state:
	'state' ID LBRACKET statePart* RBRACKET stateTransitions? DELIMITER;
stateTransitions: transition ( ',' transition)*;
statePart:
	part = 'body' LBRACKET statement* RBRACKET
	| part = 'onEnter' LBRACKET algDef DELIMITER RBRACKET;
transition: 'from' ID (',' ID)* 'on' LPAREN expr RPAREN;
statement: (diffDef | algDef | initCond) DELIMITER;
diffDef: ID '\'' '=' expr;
algDef: ID '=' expr;
initCond: ID '(' 't0' ')' eq = '=' expr;
constDef: 'const' ID '=' expr DELIMITER;
expr:
	LPAREN expr RPAREN
	| luop = ('!' | '+' | '-') expr
	| ID LPAREN expr (',' expr+)* RPAREN
	| ID LPAREN RPAREN
	| expr bop = '^' expr
	| expr bop = ('*' | '/') expr
	| expr bop = ('+' | '-') expr
	| expr bop = ('==' | '!=' | '<' | '<=' | '>' | '>=') expr
	| expr bop = ('&&' | '||') expr
	| ID
	| NUMBER;

ID: [a-zA-Z_$]([a-zA-Z_$0-9])*;
fragment SIGN: '+' | '-';
BIN_OP:
	'^'
	| '*'
	| '/'
	| SIGN
	| '=='
	| '!='
	| '<'
	| '<='
	| '>'
	| '>='
	| '||'
	| '&&';
L_UN_OP: '!' | SIGN;
LPAREN: '(';
RPAREN: ')';
LBRACKET: '{';
RBRACKET: '}';
DELIMITER: ';';
NUMBER: SIGN? [0-9]+ ('.' [0-9]+)?;
FORMAT: [\r\n\t ]+ -> skip;