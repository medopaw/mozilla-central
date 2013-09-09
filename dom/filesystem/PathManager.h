/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "nsString.h"

namespace mozilla {
namespace dom {
namespace filesystem {

/*
 * FileSystem path manager.
 */
class PathManager MOZ_FINAL
{
public:
  PathManager(const nsAString& aBase);
  ~PathManager();

private:
  const char mSeparatorChar;
  // Separator must be a single char. This is just for convenience.
  const nsString mSeparator;

  const nsString mNul;
  const nsString mBackslash;

  const nsString mSelfReference;
  const nsString mParentReference;

  // The dom path of root directory, normally "/"
  const nsString mRoot;
  // The real path of root directory, e.g. "/sdcard"
  const nsString mBase;

public:

  bool IsRoot(const nsAString& aPath);
  bool IsBase(const nsAString& aPath);
  bool WithinBase(const nsAString& aPath);

  void RealPathToDOMPath(const nsAString& aRealPath, nsString& aInnerPath);
  void DOMPathToRealPath(const nsAString& aInnerPath, nsString& aRealPath);

  bool BeginsWithSeparator(const nsAString& aPath);
  bool EndsWithSeparator(const nsAString& aPath);
  bool IsAbsolute(const nsAString& aPath);
  bool IsValidName(const nsAString& aPath);
  bool IsValidPath(const nsAString& aPath);
  bool IsParentOf(const nsAString& aPath, const nsAString& aHead);

  void Split(const nsAString& aPath, nsTArray<nsString>& aComponents);
  void Separate(const nsAString& aPath, nsString& aParent, nsString& aName);

  void TrimHead(nsString& aPath, const nsAString& aHead);
  void TrimTail(nsString& aPath, const nsAString& aTail);
  void EnsureDirectory(nsString& aPath);
  void Append(nsString& aPath, const nsAString& aToAppend);
  void Append(const nsAString& aParent, const nsAString& aToAppend, nsString& retval);
  void Absolutize(nsString& aPath, const nsAString& aParent);
  void Absolutize(const nsAString& aPath, const nsAString& aParent, nsString& retval);
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla
