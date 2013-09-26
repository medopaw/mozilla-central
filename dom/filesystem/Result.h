/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_result_h__
#define mozilla_dom_result_h__

#include "nsAutoPtr.h"
#include "FileUtils.h"

namespace mozilla {
namespace dom {
namespace filesystem {

MOZ_BEGIN_ENUM_CLASS(FilesystemResultType, uint32_t)
  Bool,
  Directory,
  DirectoryOrFile,
  File
MOZ_END_ENUM_CLASS(FilesystemResultType)

class Result
{
public:
  Result(FilesystemResultType aResultType);
  virtual ~Result();

  NS_IMETHOD_(nsrefcnt) AddRef();
  NS_IMETHOD_(nsrefcnt) Release();

protected:
  nsAutoRefCnt mRefCnt;
  NS_DECL_OWNINGTHREAD

public:
  FilesystemResultType GetType();

protected:
  FilesystemResultType mResultType;
};

class BoolResult : public Result
{
public:
  BoolResult();
  ~BoolResult();

  bool mValue;
};

class FileInfoResult : public Result
{
public:
  FileInfoResult(FilesystemResultType aResultType);
  ~FileInfoResult();

  FileInfo mValue;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla

#endif // mozilla_dom_result_h__
