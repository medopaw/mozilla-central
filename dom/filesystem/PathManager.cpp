/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PathManager.h"
#include "nsTArray.h"

namespace mozilla {
namespace dom {
namespace filesystem {

NS_IMPL_ADDREF(PathManager)
NS_IMPL_RELEASE(PathManager)

PathManager::PathManager(const nsAString& aBase) :
  mSeparatorChar('/'),
  mSeparator(NS_LITERAL_STRING("/")),
  mNul(NS_LITERAL_STRING("\0")),
  mBackslash(NS_LITERAL_STRING("\\")),
  mSelfReference(NS_LITERAL_STRING(".")),
  mParentReference(NS_LITERAL_STRING("..")),
  mRoot(mSeparator),
  mBase(aBase)
{
}

PathManager::~PathManager()
{
}

bool
PathManager::IsRoot(const nsAString& aPath)
{
  MOZ_ASSERT(IsAbsolute(aPath), "Path must be absolute!");
  return aPath == mRoot;
}

bool
PathManager::IsBase(const nsAString& aPath)
{
  MOZ_ASSERT(IsAbsolute(aPath), "Path must be absolute!");
  return aPath == mBase;
}

bool
PathManager::WithinBase(const nsAString& aPath)
{
  MOZ_ASSERT(IsAbsolute(aPath), "Path must be absolute!");
  return IsParentOf(mBase, aPath) || IsBase(aPath);
}

void
PathManager::RealPathToDOMPath(const nsAString& aRealPath, nsString& aInnerPath)
{
  MOZ_ASSERT(WithinBase(aRealPath),
      "Path must be within the scope of FileSystem!");
  // Special case for root
  if (IsBase(aRealPath)) {
    aInnerPath = mRoot;
  } else {
    aInnerPath = aRealPath;
    TrimHead(aInnerPath, mBase);
  }
}

void
PathManager::DOMPathToRealPath(const nsAString& aInnerPath, nsString& aRealPath)
{
  MOZ_ASSERT(IsAbsolute(aInnerPath), "Path must be absolute!");
  // Special case for root
  if (IsRoot(aInnerPath)) {
    aRealPath = mBase;
  } else {
    aRealPath = mBase + aInnerPath;
  }
}

bool
PathManager::BeginsWithSeparator(const nsAString& aPath)
{
  return StringBeginsWith(aPath, mSeparator);
}

bool
PathManager::EndsWithSeparator(const nsAString& aPath)
{
  return StringEndsWith(aPath, mSeparator);
}

bool
PathManager::IsAbsolute(const nsAString& aPath)
{
  return StringBeginsWith(aPath, mRoot);
}

bool
PathManager::IsValidName(const nsAString& aName)
{
  if (FindInReadable(mSeparator, aName)) {
    return false;
  }

  if (aName == mSelfReference || aName == mParentReference) {
    return false;
  }

  return IsValidPath(aName);
}

bool
PathManager::IsValidPath(const nsAString& aPath)
{
  if (aPath.IsEmpty() || IsRoot(aPath)) {
    return true;
  }

  if (IsAbsolute(aPath)) {
    return false;
  }

  if (FindInReadable(mNul, aPath)) {
    return false;
  }

  if (FindInReadable(mBackslash, aPath)) {
    return false;
  }

  if (FindInReadable(mSelfReference, aPath)) {
    return false;
  }

  if (FindInReadable(mParentReference, aPath)) {
    return false;
  }

  return true;
}

bool
PathManager::IsParentOf(const nsAString& aParent, const nsAString& aMayBeChild)
{
  MOZ_ASSERT(IsAbsolute(aParent) && IsAbsolute(aMayBeChild),
      "Path must be absolute!");
  // check length
  if (aParent.Length() >= aMayBeChild.Length()
      || !StringBeginsWith(aMayBeChild, aParent)) {
    return false;
  }
  // check separator
  if (Substring(aMayBeChild, aParent.Length(), 1) != mSeparator) {
    return false;
  }
  return true;
}

void
PathManager::Split(const nsAString& aPath, nsTArray<nsString>& aArray)
{
  nsTArray<nsCString> array;

  // Call ParseString utility to do the work
  ParseString(NS_ConvertUTF16toUTF8(aPath), mSeparatorChar, array);

  // No need to clear aArray first
  for (PRUint32 i = 0; i < array.Length(); i++) {
    aArray.AppendElement(NS_ConvertUTF8toUTF16(array[i]));
  }
}

void
PathManager::Separate(const nsAString& aPath, nsString& aParent, nsString& aName)
{
  MOZ_ASSERT(IsAbsolute(aParent), "Path must be absolute!");
  // Note that path does not necessarily exist.

  // This is to simplify the problem. Does not mean that path has to be directory.
  nsString path(aPath);
  EnsureDirectory(path);

  nsTArray<nsString> parts;
  Split(path, parts);
  if (parts.Length() > 0) {
    aName = parts[parts.Length() - 1];
    aParent = path;
    TrimTail(aParent, aName + mSeparator);
  } else {
    aName.SetIsVoid(true);
    aParent = path;
  }
}

void
TrimHead(nsString& aPath, const nsAString& aHead)
{
  MOZ_ASSERT(StringBeginsWith(aPath, aHead), "aPath must starts with aHead");
  aPath = Substring(aPath, aHead.Length(), aPath.Length() - aHead.Length());
}

void
PathManager::TrimTail(nsString& aPath, const nsAString& aTail)
{
  MOZ_ASSERT(StringEndsWith(aPath, aTail), "aPath must ends with aTail");
  aPath = Substring(aPath, 0, aPath.Length() - aTail.Length());
}

void
PathManager::EnsureDirectory(nsString& aPath)
{
  if (!EndsWithSeparator(aPath)) {
    aPath += mSeparator;
  }
}

void
PathManager::Append(nsString& aPath, const nsAString& aToAppend)
{
  MOZ_ASSERT(!IsAbsolute(aToAppend), "Path must be relative!");
  EnsureDirectory(aPath);
  aPath += aToAppend;
}

void
PathManager::Append(const nsAString& aParent, const nsAString& aToAppend,
    nsString& retval)
{
  retval = aParent;
  Append(retval, aToAppend);
}

void
PathManager::Absolutize(nsString& aPath, const nsAString& aParent)
{
  nsString absolutePath;
  Absolutize(aPath, aParent, absolutePath);
  aPath = absolutePath;
}

void
PathManager::Absolutize(const nsAString& aPath, const nsAString& aParent,
    nsString& retval)
{
  MOZ_ASSERT(IsAbsolute(aParent), "Path must be absolute!");
  if (!PathManager::IsAbsolute(aPath)) {
    Append(aParent, aPath, retval);
  } else {
    retval = aPath;
  }
  // PathManager::RemoveExtraParentReferences(retval);
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
