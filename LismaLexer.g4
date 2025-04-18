lexer grammar LismaLexer;

STATE: 'state';
BODY: 'body';
ON_ENTER: 'onEnter';
IF: 'if';
WHEN: 'when';
CONST: 'const';
FROM: 'from';
ON: 'on';
ZERO_TIME: 't0';
SIGN: '+' | '-';
ASSIGN: '=';
EXCLAMATION: '!';
MULTIPLY: '*';
EQUAL: '==';
NOT_EQUAL: '!=';
GT: '>';
GTE: '>=';
LT: '<';
LTE: '<=';
AND: '&&';
OR: '||';
DIVIDE: '/';
DER: '\'';
LPAREN: '(';
RPAREN: ')';
LBRACKET: '{';
RBRACKET: '}';
LSQUARE: '[';
RSQUARE: ']';
COMMA: ',';
DELIMITER: ';';
ID: [a-zA-Z_$]([a-zA-Z_$0-9])*;
NUMBER:
	SIGN? [0-9]+ ('.' [0-9]+)?
	| SIGN? [0-9]'.' [0-9]+ 'E' SIGN [0-9];
FORMAT: [\r\n\t ]+ -> skip;
SINGLE_LINE_COMMENT: '//' ~[\r\n]* -> skip;
MULTI_LINE_COMMENT:
	'/*' (MULTI_LINE_COMMENT | .)*? '*/' -> skip;