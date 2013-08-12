/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "nsString.h"

namespace mozilla {
namespace dom {
namespace sdcard {

/*
 * FileSystem path utilities.
 * All methods in this class are static.
 */
class Path {
public:
  static const char separatorChar;
  // Separator must be a single char. This is just for convenience.
  static const nsString separator;

  static const nsString nul;
  static const nsString backslash;

  static const nsString selfReference;
  static const nsString parentReference;

  // FileSystem.root.fullPath, normally "/"
  static const nsString root;
  // The real path of FileSystem.root, normally "/sdcard"
  static nsString base;

  static bool IsRoot(const nsAString& aPath);
  static bool IsBase(const nsAString& aPath);
  static bool WithinBase(const nsAString& aPath);

  static void RealPathToDOMPath(const nsAString& aRealPath, nsString& aInnerPath);
  static void DOMPathToRealPath(const nsAString& aInnerPath, nsString& aRealPath);

  static bool BeginsWithSeparator(const nsAString& aPath);
  static bool EndsWithSeparator(const nsAString& aPath);
  static bool IsAbsolute(const nsAString& aPath);
  static bool IsValidName(const nsAString& aPath);
  static bool IsValidPath(const nsAString& aPath);
  static bool IsParentOf(const nsAString& aPath, const nsAString& aHead);

  static void Split(const nsAString& aPath, nsTArray<nsString>& aComponents);

  static void Decapitate(nsString& aPath, const nsAString& aHead);
  static void EnsureDirectory(nsString& aPath);
  static void Append(nsString& aPath, const nsAString& aToAppend);
  static void Append(const nsAString& aParent, const nsAString& aToAppend, nsString& retval);
  static void Absolutize(nsString& aPath, const nsAString& aParent);
  static void Absolutize(const nsAString& aPath, const nsAString& aParent, nsString& retval);
  // static void RemoveExtraParentReferences(nsString& aPath);
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
