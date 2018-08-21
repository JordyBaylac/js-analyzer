
//http://esprima.org/demo/parse.html?code=some_variable%20%3D%206%3B%0A
export function isVariableDeclarator(node) {
    return node.type == 'VariableDeclarator';
}

//http://esprima.org/demo/parse.html?code=var%20some_variable%20%3D%206%3B%0A
export function isAssignmentExpression(node) {    
    return node.type == 'AssignmentExpression'; 
}

export function isMemberExpression(node) {
    return node.type == 'MemberExpression';
}

export function isFunctionDeclaration(node) {
    return node.type == 'FunctionDeclaration';
}

export function isFunctionExpression(node) {
    return node.type == 'FunctionExpression';
}

export function isExpressionStatement(node) {
    return node.type == 'ExpressionStatement';
}

export function isIIFE(node) {
    return node.type === 'CallExpression' && node.callee.type === 'FunctionExpression';
}

export function isProgam(node) {
    return node.type === 'Program';
}

export function isThisExpression(node) {
    return node.type === 'ThisExpression';
}

export function isVarDefined(varName, scopeChain) {
    for (var i = 0; i < scopeChain.length; i++) {
        var scope = scopeChain[i];
        if (scope.indexOf(varName) !== -1) {
            return true;
        }
    }
    return false;
}


export function compoundMemberName(memberExpression) {
    var name = '';

    if (isMemberExpression(memberExpression.object)) {
        name += compoundMemberName(memberExpression.object);
    }
    else if (memberExpression.object && memberExpression.object.name) {
        name = memberExpression.object.name;
    }
    else if (memberExpression.name) {
        name = memberExpression.name;
    }

    if (memberExpression.property) {
        name += '.' + memberExpression.property.name;
    }

    if(isThisExpression(memberExpression.object)){
        name = "this" + name
    }

    return name;
}


export function shouldCreatesNewScope(node) {
    return node && (isFunctionDeclaration(node) || isFunctionExpression(node) || isProgam(node));
}

export function printScope(scope, node) {
    var varsDisplay = scope.join(', ');
    if (isProgam(node)) {
        console.log('Variables declared in the global scope:', varsDisplay);
    } else if (node.id && node.id.name) {
        console.log('Variables declared inside the function ' + node.id.name + '():', varsDisplay);
    } else {
        console.log('Variables declared inside anonymous function:', varsDisplay);
    }
}

export function getScopeDescription(node) {
    if (isProgam(node)) {
       return 'global scope (line: ' + node.loc.start.line + ')' ;
    } else if (node.id && node.id.name) {
        return 'function scope ' + node.id.name + '  (line: ' + node.loc.start.line + ')' ;
    } else {
        return 'anonymous function scope  (line: ' + node.loc.start.line + ')' ;
    }
}

