grammar Lisma;
prog: topLevelStatement* EOF;
topLevelStatement:
	constDef
	| initCond
	| state
	| whenStatement
	| ifStatement;
state:
	'state' ID LBRACKET statePart* RBRACKET stateTransitions? DELIMITER;
stateTransitions: transition ( ',' transition)*;
statePart:
	part = 'body' LBRACKET definition* RBRACKET
	| part = 'onEnter' LBRACKET algDef* RBRACKET;
ifStatement:
	'if' LPAREN expr RPAREN LBRACKET definition* RBRACKET;
whenStatement:
	'when' LPAREN expr RPAREN LBRACKET algDef* RBRACKET;
transition: 'from' ID (',' ID)* 'on' LPAREN expr RPAREN;
definition: diffDef | algDef;
diffDef: ID '\'' '=' expr DELIMITER;
algDef: ID '=' expr DELIMITER;
initCond: ID '(' 't0' ')' eq = '=' expr DELIMITER;
constDef: 'const' ID '=' expr DELIMITER;
expr:
	LPAREN expr RPAREN											# parenExpr
	| luop = ('!' | '+' | '-') expr								# unaryExpr
	| ID LPAREN expr (',' expr+)* RPAREN						# callExpr
	| ID LPAREN RPAREN											# callExpr
	| expr bop = '^' expr										# binaryExpr
	| expr bop = ('*' | '/') expr								# binaryExpr
	| expr bop = ('+' | '-') expr								# binaryExpr
	| expr bop = ('==' | '!=' | '<' | '<=' | '>' | '>=') expr	# binaryExpr
	| expr bop = ('&&' | '||') expr								# binaryExpr
	| ID														# atomExpr
	| NUMBER													# atomExpr;

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
NUMBER:
	SIGN? [0-9]+ ('.' [0-9]+)?
	| SIGN? [0-9]'.' [0-9]+ 'E' SIGN [0-9];
FORMAT: [\r\n\t ]+ -> skip;
SINGLE_LINE_COMMENT: '//' ~[\r\n]* -> skip;
MULTI_LINE_COMMENT:
	'/*' (MULTI_LINE_COMMENT | .)*? '*/' -> skip;