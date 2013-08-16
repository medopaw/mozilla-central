/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "nsString.h"
#include "nsIFile.h"

namespace mozilla {
namespace dom {
namespace sdcard {

/*
 * nsIFile related utilities.
 * All methods in this class are static.
 */

struct FileInfo
{
  bool isFile;
  bool isDirectory;
  nsString name;
  nsString fullPath;
};

class FileUtils
{
public:
  static unsigned long GetType(bool aIsFile);
  static nsresult IsDirectory(const nsAString& aPath, bool* aExists);
  static nsresult IsFile(const nsAString& aPath, bool* aExists);
  static nsresult Exists(const nsAString& aPath, bool* aExists);
  static nsresult IsDirectoryEmpty(nsIFile* aDir, bool* aEmpty);
  static nsresult GetFileInfo(const nsAString& aPath, FileInfo& aInfo);
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
