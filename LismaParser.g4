parser grammar LismaParser;

options {
	tokenVocab = LismaLexer;
}

prog: topLevelStatement* EOF;
topLevelStatement:
	varDef
	| constDef
	| initCond
	| state
	| whenStatement
	| whileStatement
	| ifStatement
	| arrayDefinition;
state:
	STATE ID LBRACKET statePart* RBRACKET stateTransitions? DELIMITER;
stateTransitions: transition ( COMMA transition)*;
statePart:
	part = BODY LBRACKET definition* RBRACKET
	| part = ON_ENTER LBRACKET discreteStatement* RBRACKET;
ifStatement:
	IF LPAREN expr RPAREN LBRACKET definition* RBRACKET;
whenStatement:
	WHEN LPAREN expr RPAREN LBRACKET discreteStatement* RBRACKET;
whileStatement:
	WHILE LPAREN expr RPAREN LBRACKET discreteStatement* RBRACKET;
arrayDefinition:
	ID ASSIGN LSQUARE expr (COMMA expr)* RSQUARE DELIMITER;
discreteStatement: algDef | nativeStatement;
nativeStatement:
	NATIVE OPEN_BACKTICK CODE_CONTENT CLOSE_BACKTICK;
transition: FROM ID (COMMA ID)* ON LPAREN expr RPAREN;
definition: diffDef | algDef;
diffDef: ID DER ASSIGN expr DELIMITER;
algDef: ID ASSIGN expr DELIMITER;
initCond: ID LPAREN ZERO_TIME RPAREN eq = ASSIGN expr DELIMITER;
varDef: VAR idDef;
constDef: CONST idDef;
idDef: ID ASSIGN expr DELIMITER;
expr:
	LPAREN expr RPAREN											# parenExpr
	| luop = (EXCLAMATION | SIGN) expr							# unaryExpr
	| ID LPAREN expr (COMMA expr+)* RPAREN						# callExpr
	| ID LPAREN RPAREN											# callExpr
	| ID LSQUARE expr RSQUARE									# arrExpr
	| expr bop = (MULTIPLY | DIVIDE | REMAINDER) expr			# binaryExpr
	| expr bop = SIGN expr										# binaryExpr
	| expr bop = (EQUAL | NOT_EQUAL | LT | LTE | GT | GTE) expr	# binaryExpr
	| expr bop = (OR | AND) expr								# binaryExpr
	| ID														# atomExpr
	| NUMBER													# atomExpr;