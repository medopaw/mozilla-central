/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_filesystemservice_h__
#define mozilla_dom_filesystemservice_h__

#include "mozilla/StaticPtr.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/dom/Promise.h"
#include "nsString.h"
#include "nsAutoPtr.h"

namespace mozilla {

class ErrorResult;

namespace dom {

class Promise;
class FilesystemParams;

namespace filesystem {

class Directory;
class Filesystem;
class FilesystemRequestParent;

class FilesystemService
{
public:
  ~FilesystemService() {}

  /**
   * Static method to return the singleton instance.
   */
  static FilesystemService* GetSingleton();

  void CreateDirectory(const FilesystemParams& aParam,
                       FilesystemRequestParent* aParent);

  already_AddRefed<Promise> GetEntrance(Filesystem* aFs, ErrorResult& aRv);
  void GetEntrance(const FilesystemParams& aParam,
                   FilesystemRequestParent* aParent);
private:
  FilesystemService();

  static StaticAutoPtr<FilesystemService> sInstance;

  // Whether current process is the child process.
  bool mIsChild;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla

#endif // mozilla_dom_filesystemservice_h__
