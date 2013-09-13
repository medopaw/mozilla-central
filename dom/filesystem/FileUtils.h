/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "nsString.h"
#include "nsCOMPtr.h"

class nsIFile;

namespace mozilla {
namespace dom {
namespace filesystem {

class Directory;
class Filesystem;

/*
 * nsIFile related utilities.
 * All methods in this class are static.
 */

struct FileInfo
{
  bool exists;
  bool isDirectory;
  bool isFile;
  nsString relpath;
  nsString name;
};

class FileUtils
{
public:
  // static unsigned long GetType(bool aIsFile);
  static nsresult IsDirectoryEmpty(nsIFile* aDir, bool* aEmpty);
  static nsresult GetFileInfo(const nsAString& aPath, FileInfo& aInfo);
  static nsresult GetFileInfo(nsIFile* aFile, FileInfo& aInfo);
  static Directory* CreateDirectory(Filesystem* aFilesystem, const nsAString& aRelpath, const nsAString& aName);
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
