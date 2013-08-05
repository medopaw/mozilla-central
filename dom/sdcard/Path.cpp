/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Path.h"
#include "nsTArray.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

// These two must be of the same value.
const char Path::separatorChar = '/';
const nsString Path::separator = NS_LITERAL_STRING("/");

const nsString Path::nul = NS_LITERAL_STRING("\0");
const nsString Path::backslash = NS_LITERAL_STRING("\\");

const nsString Path::selfReference = NS_LITERAL_STRING(".");
const nsString Path::parentReference = NS_LITERAL_STRING("..");

const nsString Path::root = Path::separator;
const nsString Path::base = Path::root + NS_LITERAL_STRING("sdcard");

bool
Path::IsRoot(const nsAString& aPath)
{
  MOZ_ASSERT(Path::IsAbsolute(aPath), "Path must be absolute!");
  return aPath == Path::root;
}

bool
Path::IsBase(const nsAString& aPath)
{
  MOZ_ASSERT(Path::IsAbsolute(aPath), "Path must be absolute!");
  return aPath == Path::base;
}

bool
Path::WithinBase(const nsAString& aPath)
{
  MOZ_ASSERT(Path::IsAbsolute(aPath), "Path must be absolute!");
  return Path::IsParentOf(Path::base, aPath) || Path::IsBase(aPath);
}

void
Path::RealPathToDOMPath(const nsAString& aRealPath, nsString& aInnerPath)
{
  MOZ_ASSERT(Path::WithinBase(aRealPath),
      "Path must be within the scope of FileSystem!");
  // Special case for root
  if (Path::IsBase(aRealPath)) {
    aInnerPath = Path::root;
  } else {
    aInnerPath = aRealPath;
    Path::Decapitate(aInnerPath, Path::base);
  }
  SDCARD_LOG("Real path to DOM path: %s -> %s",
      NS_ConvertUTF16toUTF8(aInnerPath).get(),
      NS_ConvertUTF16toUTF8(aRealPath).get());
}

void
Path::DOMPathToRealPath(const nsAString& aInnerPath, nsString& aRealPath)
{
  MOZ_ASSERT(Path::IsAbsolute(aInnerPath), "Path must be absolute!");
  // Special case for root
  if (Path::IsRoot(aInnerPath)) {
    aRealPath = Path::base;
  } else {
    aRealPath = Path::base + aInnerPath;
  }
  SDCARD_LOG("DOM path to real path: %s -> %s",
      NS_ConvertUTF16toUTF8(aInnerPath).get(),
      NS_ConvertUTF16toUTF8(aRealPath).get());
}

bool
Path::BeginsWithSeparator(const nsAString& aPath)
{
  return StringBeginsWith(aPath, Path::separator);
}

bool
Path::EndsWithSeparator(const nsAString& aPath)
{
  return StringEndsWith(aPath, Path::separator);
}

bool
Path::IsAbsolute(const nsAString& aPath)
{
  return StringBeginsWith(aPath, Path::root);
}

bool
Path::IsValidName(const nsAString& aName)
{
  if (FindInReadable(Path::separator, aName)) {
    return false;
  }

  if (aName == Path::selfReference || aName == Path::parentReference) {
    return false;
  }

  return Path::IsValidPath(aName);
}

bool
Path::IsValidPath(const nsAString& aPath)
{
  if (aPath.IsEmpty() || Path::IsRoot(aPath)) {
    return true;
  }

  if (Path::IsAbsolute(aPath)) {
    SDCARD_LOG("Absolute path is not allowed!");
    return false;
  }

  if (FindInReadable(Path::nul, aPath)) {
    SDCARD_LOG("Embedded NULs are not allowed!");
    return false;
  }

  if (FindInReadable(Path::backslash, aPath)) {
    SDCARD_LOG("Backslashes are not allowed!");
    return false;
  }

  if (FindInReadable(Path::selfReference, aPath)) {
    SDCARD_LOG("Self reference is not allowed!");
    return false;
  }

  if (FindInReadable(Path::parentReference, aPath)) {
    SDCARD_LOG("Parent reference is not allowed!");
    return false;
  }

  return true;
}

bool
Path::IsParentOf(const nsAString& aParent, const nsAString& aMayBeChild)
{
  SDCARD_LOG("Check if %s is the parent of %s",
      NS_ConvertUTF16toUTF8(aParent).get(),
      NS_ConvertUTF16toUTF8(aMayBeChild).get());
  MOZ_ASSERT(Path::IsAbsolute(aParent) && Path::IsAbsolute(aMayBeChild),
      "Path must be absolute!");
  // check length
  if (aParent.Length() >= aMayBeChild.Length()
      || !StringBeginsWith(aMayBeChild, aParent)) {
    return false;
  }
  // check separator
  if (Substring(aMayBeChild, aParent.Length(), 1) != Path::separator) {
    return false;
  }
  return true;
}

void
Path::Split(const nsAString& aPath, nsTArray<nsString>& aArray)
{
  // nsCString conversion needed here
  nsTArray<nsCString> array;

  // Call ParseString utility to do the work
  ParseString(NS_ConvertUTF16toUTF8(aPath), Path::separatorChar, array);

  // No need to clear aArray first
  for (PRUint32 i = 0; i < array.Length(); i++) {
    aArray.AppendElement(NS_ConvertUTF8toUTF16(array[i]));
  }
}

void
Path::Decapitate(nsString& aPath, const nsAString& aHead)
{
  MOZ_ASSERT(StringBeginsWith(aPath, aHead), "aPath must starts with aHead");
  aPath = Substring(aPath, aHead.Length(), aPath.Length() - aHead.Length());
}

void
Path::EnsureDirectory(nsString& aPath)
{
  if (!Path::EndsWithSeparator(aPath)) {
    aPath += Path::separator;
  }
}

void
Path::Append(nsString& aPath, const nsAString& aToAppend)
{
  MOZ_ASSERT(!Path::IsAbsolute(aToAppend), "Path must be relative!");
  Path::EnsureDirectory(aPath);
  aPath += aToAppend;
}

void
Path::Append(const nsAString& aParent, const nsAString& aToAppend,
    nsString& retval)
{
  retval = aParent;
  Path::Append(retval, aToAppend);
}

void
Path::Absolutize(nsString& aPath, const nsAString& aParent)
{
  nsString absolutePath;
  Path::Absolutize(aPath, aParent, absolutePath);
  aPath = absolutePath;
}

void
Path::Absolutize(const nsAString& aPath, const nsAString& aParent,
    nsString& retval)
{
  MOZ_ASSERT(Path::IsAbsolute(aParent), "Path must be absolute!");
  if (!Path::IsAbsolute(aPath)) {
    Path::Append(aParent, aPath, retval);
  } else {
    retval = aPath;
  }
  // Path::RemoveExtraParentReferences(retval);
  SDCARD_LOG("Absolutize path: %s -> %s", NS_ConvertUTF16toUTF8(aPath).get(),
      NS_ConvertUTF16toUTF8(retval).get());
}


/* void
Path::RemoveExtraParentReferences(nsString& aPath)
{
  MOZ_ASSERT(Path::IsAbsolute(aPath), "Path must be absolute!");

  nsTArray<nsString> components;
  nsTArray<nsString> canonicalized;

  Path::Split(aPath, components);

  for (PRUint32 i = 0; i < components.Length(); i++) {
    if (components[i] == Path::selfReference) {
      continue;
    }
    if (components[i] == Path::parentReference) {
      if (!canonicalized.IsEmpty()) {
        canonicalized.RemoveElementAt(canonicalized.Length() - 1);
      }
      continue;
    }
    canonicalized.AppendElement(components[i]);
  }

  if (canonicalized.IsEmpty()) {
    aPath = Path::root;
  }

  nsString result;
  for (PRUint32 i = 0; i < canonicalized.Length(); i++) {
    result += Path::separator;
    result += canonicalized[i];
  }
  if (Path::EndsWithSeparator(aPath)) {
    Path::EnsureDirectory(result);
  }
  aPath = result;
} */

} // namespace sdcard
} // namespace dom
} // namespace mozilla
