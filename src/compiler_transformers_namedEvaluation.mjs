import { some } from "../vendor/compiler/_namespaces/ts";

/**
 * Gets whether a node is a `static {}` block containing only a single call to the `__setFunctionName` helper where that
 * call's second argument is the value stored in the `assignedName` property of the block's `EmitNode`.
 * @internal
 */
export function isClassNamedEvaluationHelperBlock(_node) {
  return false;
}

/**
 * Gets whether a `ClassLikeDeclaration` has a `static {}` block containing only a single call to the
 * `__setFunctionName` helper.
 * @internal
 */
export function classHasExplicitlyAssignedName(node) {
    var _a;
    return !!(
      (_a = node.emitNode) === null ||
      _a === void 0 ? void 0 : _a.assignedName
    ) && some(node.members, isClassNamedEvaluationHelperBlock);
}
/**
 * Gets whether a `ClassLikeDeclaration` has a declared name or contains a `static {}` block containing only a single
 * call to the `__setFunctionName` helper.
 * @internal
 */
export function classHasDeclaredOrExplicitlyAssignedName(node) {
    return !!node.name || classHasExplicitlyAssignedName(node);
}
