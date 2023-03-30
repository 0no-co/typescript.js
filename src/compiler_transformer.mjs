import { append, createEmitHelperFactory, Debug, disposeEmitNodes, factory, getEmitFlags, getParseTreeNode, getSourceFileOfNode, isSourceFile, memoize, noop, notImplemented, returnUndefined, setEmitFlags, some, tracing } from "../vendor/compiler/_namespaces/ts";

export const noTransformers = { scriptTransformers: [], declarationTransformers: [] };

export function getTransformers() {
    return {
        scriptTransformers: [],
        declarationTransformers: [],
    };
}

export function noEmitSubstitution(_hint, node) {
  return node;
}

export function noEmitNotification(hint, node, callback) {
  callback(hint, node);
}

export function transformNodes(resolver, host, factory, options, nodes, transformers, allowDtsFiles) {
    const enabledSyntaxKindFeatures = new Array(361 /* SyntaxKind.Count */);
    let lexicalEnvironmentVariableDeclarations;
    let lexicalEnvironmentFunctionDeclarations;
    let lexicalEnvironmentStatements;
    let lexicalEnvironmentFlags = 0 /* LexicalEnvironmentFlags.None */;
    let lexicalEnvironmentVariableDeclarationsStack = [];
    let lexicalEnvironmentFunctionDeclarationsStack = [];
    let lexicalEnvironmentStatementsStack = [];
    let lexicalEnvironmentFlagsStack = [];
    let lexicalEnvironmentStackOffset = 0;
    let lexicalEnvironmentSuspended = false;
    let blockScopedVariableDeclarationsStack = [];
    let blockScopeStackOffset = 0;
    let blockScopedVariableDeclarations;
    let emitHelpers;
    let onSubstituteNode = noEmitSubstitution;
    let onEmitNode = noEmitNotification;
    let state = 0 /* TransformationState.Uninitialized */;
    const diagnostics = [];
    // The transformation context is provided to each transformer as part of transformer
    // initialization.
    const context = {
        factory,
        getCompilerOptions: () => options,
        getEmitResolver: () => resolver,
        getEmitHost: () => host,
        getEmitHelperFactory: memoize(() => createEmitHelperFactory(context)),
        startLexicalEnvironment,
        suspendLexicalEnvironment,
        resumeLexicalEnvironment,
        endLexicalEnvironment,
        setLexicalEnvironmentFlags,
        getLexicalEnvironmentFlags,
        hoistVariableDeclaration,
        hoistFunctionDeclaration,
        addInitializationStatement,
        startBlockScope,
        endBlockScope,
        addBlockScopedVariable,
        requestEmitHelper,
        readEmitHelpers,
        enableSubstitution,
        enableEmitNotification,
        isSubstitutionEnabled,
        isEmitNotificationEnabled,
        get onSubstituteNode() { return onSubstituteNode; },
        set onSubstituteNode(value) {
            Debug.assert(state < 1 /* TransformationState.Initialized */, "Cannot modify transformation hooks after initialization has completed.");
            Debug.assert(value !== undefined, "Value must not be 'undefined'");
            onSubstituteNode = value;
        },
        get onEmitNode() { return onEmitNode; },
        set onEmitNode(value) {
            Debug.assert(state < 1 /* TransformationState.Initialized */, "Cannot modify transformation hooks after initialization has completed.");
            Debug.assert(value !== undefined, "Value must not be 'undefined'");
            onEmitNode = value;
        },
        addDiagnostic(diag) {
            diagnostics.push(diag);
        }
    };
    // Ensure the parse tree is clean before applying transformations
    for (const node of nodes) {
        disposeEmitNodes(getSourceFileOfNode(getParseTreeNode(node)));
    }
    performance.mark("beforeTransform");
    // Chain together and initialize each transformer.
    const transformersWithContext = transformers.map(t => t(context));
    const transformation = (node) => {
        for (const transform of transformersWithContext) {
            node = transform(node);
        }
        return node;
    };
    // prevent modification of transformation hooks.
    state = 1 /* TransformationState.Initialized */;
    // Transform each node.
    const transformed = [];
    for (const node of nodes) {
        tracing === null || tracing === void 0 ? void 0 : tracing.push("emit" /* tracing.Phase.Emit */, "transformNodes", node.kind === 308 /* SyntaxKind.SourceFile */ ? { path: node.path } : { kind: node.kind, pos: node.pos, end: node.end });
        transformed.push((allowDtsFiles ? transformation : transformRoot)(node));
        tracing === null || tracing === void 0 ? void 0 : tracing.pop();
    }
    // prevent modification of the lexical environment.
    state = 2 /* TransformationState.Completed */;
    performance.mark("afterTransform");
    performance.measure("transformTime", "beforeTransform", "afterTransform");
    return {
        transformed,
        substituteNode,
        emitNodeWithNotification,
        isEmitNotificationEnabled,
        dispose,
        diagnostics
    };
    function transformRoot(node) {
        return node && (!isSourceFile(node) || !node.isDeclarationFile) ? transformation(node) : node;
    }
    /**
     * Enables expression substitutions in the pretty printer for the provided SyntaxKind.
     */
    function enableSubstitution(kind) {
        Debug.assert(state < 2 /* TransformationState.Completed */, "Cannot modify the transformation context after transformation has completed.");
        enabledSyntaxKindFeatures[kind] |= 1 /* SyntaxKindFeatureFlags.Substitution */;
    }
    /**
     * Determines whether expression substitutions are enabled for the provided node.
     */
    function isSubstitutionEnabled(node) {
        return (enabledSyntaxKindFeatures[node.kind] & 1 /* SyntaxKindFeatureFlags.Substitution */) !== 0
            && (getEmitFlags(node) & 8 /* EmitFlags.NoSubstitution */) === 0;
    }
    /**
     * Emits a node with possible substitution.
     *
     * @param hint A hint as to the intended usage of the node.
     * @param node The node to emit.
     * @param emitCallback The callback used to emit the node or its substitute.
     */
    function substituteNode(hint, node) {
        Debug.assert(state < 3 /* TransformationState.Disposed */, "Cannot substitute a node after the result is disposed.");
        return node && isSubstitutionEnabled(node) && onSubstituteNode(hint, node) || node;
    }
    /**
     * Enables before/after emit notifications in the pretty printer for the provided SyntaxKind.
     */
    function enableEmitNotification(kind) {
        Debug.assert(state < 2 /* TransformationState.Completed */, "Cannot modify the transformation context after transformation has completed.");
        enabledSyntaxKindFeatures[kind] |= 2 /* SyntaxKindFeatureFlags.EmitNotifications */;
    }
    /**
     * Determines whether before/after emit notifications should be raised in the pretty
     * printer when it emits a node.
     */
    function isEmitNotificationEnabled(node) {
        return (enabledSyntaxKindFeatures[node.kind] & 2 /* SyntaxKindFeatureFlags.EmitNotifications */) !== 0
            || (getEmitFlags(node) & 4 /* EmitFlags.AdviseOnEmitNode */) !== 0;
    }
    /**
     * Emits a node with possible emit notification.
     *
     * @param hint A hint as to the intended usage of the node.
     * @param node The node to emit.
     * @param emitCallback The callback used to emit the node.
     */
    function emitNodeWithNotification(hint, node, emitCallback) {
        Debug.assert(state < 3 /* TransformationState.Disposed */, "Cannot invoke TransformationResult callbacks after the result is disposed.");
        if (node) {
            // TODO: Remove check and unconditionally use onEmitNode when API is breakingly changed
            // (see https://github.com/microsoft/TypeScript/pull/36248/files/5062623f39120171b98870c71344b3242eb03d23#r369766739)
            if (isEmitNotificationEnabled(node)) {
                onEmitNode(hint, node, emitCallback);
            }
            else {
                emitCallback(hint, node);
            }
        }
    }
    /**
     * Records a hoisted variable declaration for the provided name within a lexical environment.
     */
    function hoistVariableDeclaration(name) {
        Debug.assert(state > 0 /* TransformationState.Uninitialized */, "Cannot modify the lexical environment during initialization.");
        Debug.assert(state < 2 /* TransformationState.Completed */, "Cannot modify the lexical environment after transformation has completed.");
        const decl = setEmitFlags(factory.createVariableDeclaration(name), 128 /* EmitFlags.NoNestedSourceMaps */);
        if (!lexicalEnvironmentVariableDeclarations) {
            lexicalEnvironmentVariableDeclarations = [decl];
        }
        else {
            lexicalEnvironmentVariableDeclarations.push(decl);
        }
        if (lexicalEnvironmentFlags & 1 /* LexicalEnvironmentFlags.InParameters */) {
            lexicalEnvironmentFlags |= 2 /* LexicalEnvironmentFlags.VariablesHoistedInParameters */;
        }
    }
    /**
     * Records a hoisted function declaration within a lexical environment.
     */
    function hoistFunctionDeclaration(func) {
        Debug.assert(state > 0 /* TransformationState.Uninitialized */, "Cannot modify the lexical environment during initialization.");
        Debug.assert(state < 2 /* TransformationState.Completed */, "Cannot modify the lexical environment after transformation has completed.");
        setEmitFlags(func, 2097152 /* EmitFlags.CustomPrologue */);
        if (!lexicalEnvironmentFunctionDeclarations) {
            lexicalEnvironmentFunctionDeclarations = [func];
        }
        else {
            lexicalEnvironmentFunctionDeclarations.push(func);
        }
    }
    /**
     * Adds an initialization statement to the top of the lexical environment.
     */
    function addInitializationStatement(node) {
        Debug.assert(state > 0 /* TransformationState.Uninitialized */, "Cannot modify the lexical environment during initialization.");
        Debug.assert(state < 2 /* TransformationState.Completed */, "Cannot modify the lexical environment after transformation has completed.");
        setEmitFlags(node, 2097152 /* EmitFlags.CustomPrologue */);
        if (!lexicalEnvironmentStatements) {
            lexicalEnvironmentStatements = [node];
        }
        else {
            lexicalEnvironmentStatements.push(node);
        }
    }
    /**
     * Starts a new lexical environment. Any existing hoisted variable or function declarations
     * are pushed onto a stack, and the related storage variables are reset.
     */
    function startLexicalEnvironment() {
        Debug.assert(state > 0 /* TransformationState.Uninitialized */, "Cannot modify the lexical environment during initialization.");
        Debug.assert(state < 2 /* TransformationState.Completed */, "Cannot modify the lexical environment after transformation has completed.");
        Debug.assert(!lexicalEnvironmentSuspended, "Lexical environment is suspended.");
        // Save the current lexical environment. Rather than resizing the array we adjust the
        // stack size variable. This allows us to reuse existing array slots we've
        // already allocated between transformations to avoid allocation and GC overhead during
        // transformation.
        lexicalEnvironmentVariableDeclarationsStack[lexicalEnvironmentStackOffset] = lexicalEnvironmentVariableDeclarations;
        lexicalEnvironmentFunctionDeclarationsStack[lexicalEnvironmentStackOffset] = lexicalEnvironmentFunctionDeclarations;
        lexicalEnvironmentStatementsStack[lexicalEnvironmentStackOffset] = lexicalEnvironmentStatements;
        lexicalEnvironmentFlagsStack[lexicalEnvironmentStackOffset] = lexicalEnvironmentFlags;
        lexicalEnvironmentStackOffset++;
        lexicalEnvironmentVariableDeclarations = undefined;
        lexicalEnvironmentFunctionDeclarations = undefined;
        lexicalEnvironmentStatements = undefined;
        lexicalEnvironmentFlags = 0 /* LexicalEnvironmentFlags.None */;
    }
    /** Suspends the current lexical environment, usually after visiting a parameter list. */
    function suspendLexicalEnvironment() {
        Debug.assert(state > 0 /* TransformationState.Uninitialized */, "Cannot modify the lexical environment during initialization.");
        Debug.assert(state < 2 /* TransformationState.Completed */, "Cannot modify the lexical environment after transformation has completed.");
        Debug.assert(!lexicalEnvironmentSuspended, "Lexical environment is already suspended.");
        lexicalEnvironmentSuspended = true;
    }
    /** Resumes a suspended lexical environment, usually before visiting a function body. */
    function resumeLexicalEnvironment() {
        Debug.assert(state > 0 /* TransformationState.Uninitialized */, "Cannot modify the lexical environment during initialization.");
        Debug.assert(state < 2 /* TransformationState.Completed */, "Cannot modify the lexical environment after transformation has completed.");
        Debug.assert(lexicalEnvironmentSuspended, "Lexical environment is not suspended.");
        lexicalEnvironmentSuspended = false;
    }
    /**
     * Ends a lexical environment. The previous set of hoisted declarations are restored and
     * any hoisted declarations added in this environment are returned.
     */
    function endLexicalEnvironment() {
        Debug.assert(state > 0 /* TransformationState.Uninitialized */, "Cannot modify the lexical environment during initialization.");
        Debug.assert(state < 2 /* TransformationState.Completed */, "Cannot modify the lexical environment after transformation has completed.");
        Debug.assert(!lexicalEnvironmentSuspended, "Lexical environment is suspended.");
        let statements;
        if (lexicalEnvironmentVariableDeclarations ||
            lexicalEnvironmentFunctionDeclarations ||
            lexicalEnvironmentStatements) {
            if (lexicalEnvironmentFunctionDeclarations) {
                statements = [...lexicalEnvironmentFunctionDeclarations];
            }
            if (lexicalEnvironmentVariableDeclarations) {
                const statement = factory.createVariableStatement(
                /*modifiers*/ undefined, factory.createVariableDeclarationList(lexicalEnvironmentVariableDeclarations));
                setEmitFlags(statement, 2097152 /* EmitFlags.CustomPrologue */);
                if (!statements) {
                    statements = [statement];
                }
                else {
                    statements.push(statement);
                }
            }
            if (lexicalEnvironmentStatements) {
                if (!statements) {
                    statements = [...lexicalEnvironmentStatements];
                }
                else {
                    statements = [...statements, ...lexicalEnvironmentStatements];
                }
            }
        }
        // Restore the previous lexical environment.
        lexicalEnvironmentStackOffset--;
        lexicalEnvironmentVariableDeclarations = lexicalEnvironmentVariableDeclarationsStack[lexicalEnvironmentStackOffset];
        lexicalEnvironmentFunctionDeclarations = lexicalEnvironmentFunctionDeclarationsStack[lexicalEnvironmentStackOffset];
        lexicalEnvironmentStatements = lexicalEnvironmentStatementsStack[lexicalEnvironmentStackOffset];
        lexicalEnvironmentFlags = lexicalEnvironmentFlagsStack[lexicalEnvironmentStackOffset];
        if (lexicalEnvironmentStackOffset === 0) {
            lexicalEnvironmentVariableDeclarationsStack = [];
            lexicalEnvironmentFunctionDeclarationsStack = [];
            lexicalEnvironmentStatementsStack = [];
            lexicalEnvironmentFlagsStack = [];
        }
        return statements;
    }
    function setLexicalEnvironmentFlags(flags, value) {
        lexicalEnvironmentFlags = value ?
            lexicalEnvironmentFlags | flags :
            lexicalEnvironmentFlags & ~flags;
    }
    function getLexicalEnvironmentFlags() {
        return lexicalEnvironmentFlags;
    }
    /**
     * Starts a block scope. Any existing block hoisted variables are pushed onto the stack and the related storage variables are reset.
     */
    function startBlockScope() {
        Debug.assert(state > 0 /* TransformationState.Uninitialized */, "Cannot start a block scope during initialization.");
        Debug.assert(state < 2 /* TransformationState.Completed */, "Cannot start a block scope after transformation has completed.");
        blockScopedVariableDeclarationsStack[blockScopeStackOffset] = blockScopedVariableDeclarations;
        blockScopeStackOffset++;
        blockScopedVariableDeclarations = undefined;
    }
    /**
     * Ends a block scope. The previous set of block hoisted variables are restored. Any hoisted declarations are returned.
     */
    function endBlockScope() {
        Debug.assert(state > 0 /* TransformationState.Uninitialized */, "Cannot end a block scope during initialization.");
        Debug.assert(state < 2 /* TransformationState.Completed */, "Cannot end a block scope after transformation has completed.");
        const statements = some(blockScopedVariableDeclarations) ?
            [
                factory.createVariableStatement(
                /*modifiers*/ undefined, factory.createVariableDeclarationList(blockScopedVariableDeclarations.map(identifier => factory.createVariableDeclaration(identifier)), 1 /* NodeFlags.Let */))
            ] : undefined;
        blockScopeStackOffset--;
        blockScopedVariableDeclarations = blockScopedVariableDeclarationsStack[blockScopeStackOffset];
        if (blockScopeStackOffset === 0) {
            blockScopedVariableDeclarationsStack = [];
        }
        return statements;
    }
    function addBlockScopedVariable(name) {
        Debug.assert(blockScopeStackOffset > 0, "Cannot add a block scoped variable outside of an iteration body.");
        (blockScopedVariableDeclarations || (blockScopedVariableDeclarations = [])).push(name);
    }
    function requestEmitHelper(helper) {
        Debug.assert(state > 0 /* TransformationState.Uninitialized */, "Cannot modify the transformation context during initialization.");
        Debug.assert(state < 2 /* TransformationState.Completed */, "Cannot modify the transformation context after transformation has completed.");
        Debug.assert(!helper.scoped, "Cannot request a scoped emit helper.");
        if (helper.dependencies) {
            for (const h of helper.dependencies) {
                requestEmitHelper(h);
            }
        }
        emitHelpers = append(emitHelpers, helper);
    }
    function readEmitHelpers() {
        Debug.assert(state > 0 /* TransformationState.Uninitialized */, "Cannot modify the transformation context during initialization.");
        Debug.assert(state < 2 /* TransformationState.Completed */, "Cannot modify the transformation context after transformation has completed.");
        const helpers = emitHelpers;
        emitHelpers = undefined;
        return helpers;
    }
    function dispose() {
        if (state < 3 /* TransformationState.Disposed */) {
            // Clean up emit nodes on parse tree
            for (const node of nodes) {
                disposeEmitNodes(getSourceFileOfNode(getParseTreeNode(node)));
            }
            // Release references to external entries for GC purposes.
            lexicalEnvironmentVariableDeclarations = undefined;
            lexicalEnvironmentVariableDeclarationsStack = undefined;
            lexicalEnvironmentFunctionDeclarations = undefined;
            lexicalEnvironmentFunctionDeclarationsStack = undefined;
            onSubstituteNode = undefined;
            onEmitNode = undefined;
            emitHelpers = undefined;
            // Prevent further use of the transformation result.
            state = 3 /* TransformationState.Disposed */;
        }
    }
}

export const nullTransformationContext = {
    factory: factory,
    getCompilerOptions: () => ({}),
    getEmitResolver: notImplemented,
    getEmitHost: notImplemented,
    getEmitHelperFactory: notImplemented,
    startLexicalEnvironment: noop,
    resumeLexicalEnvironment: noop,
    suspendLexicalEnvironment: noop,
    endLexicalEnvironment: returnUndefined,
    setLexicalEnvironmentFlags: noop,
    getLexicalEnvironmentFlags: () => 0,
    hoistVariableDeclaration: noop,
    hoistFunctionDeclaration: noop,
    addInitializationStatement: noop,
    startBlockScope: noop,
    endBlockScope: returnUndefined,
    addBlockScopedVariable: noop,
    requestEmitHelper: noop,
    readEmitHelpers: notImplemented,
    enableSubstitution: noop,
    enableEmitNotification: noop,
    isSubstitutionEnabled: notImplemented,
    isEmitNotificationEnabled: notImplemented,
    onSubstituteNode: noEmitSubstitution,
    onEmitNode: noEmitNotification,
    addDiagnostic: noop,
};
