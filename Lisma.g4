grammar Lisma;
prog: topLevelStatement* EOF;
topLevelStatement: constDef | initCond | state;
state:
	'state' ID LBRACKET statePart* RBRACKET stateTransitions? DELIMITER;
stateTransitions: transition ( ',' transition)*;
statePart:
	part = 'body' LBRACKET statement* RBRACKET
	| part = 'onEnter' LBRACKET algDef* RBRACKET;
transition: 'from' ID (',' ID)* 'on' LPAREN expr RPAREN;
statement: diffDef | algDef;
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
NUMBER: SIGN? [0-9]+ ('.' [0-9]+)?;
FORMAT: [\r\n\t ]+ -> skip;