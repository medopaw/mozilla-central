/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Result.h"

namespace mozilla {
namespace dom {
namespace filesystem {

NS_IMPL_ADDREF(Result)
NS_IMPL_RELEASE(Result)

Result::Result(FilesystemResultType aResultType)
  : mResultType(aResultType)
{
}

Result::~Result()
{
}

FilesystemResultType
Result::GetType()
{
  return mResultType;
}

BoolResult::BoolResult()
  : Result(FilesystemResultType::Bool)
{
}

BoolResult::~BoolResult()
{
}

FileInfoResult::FileInfoResult(FilesystemResultType aResultType)
  : Result(aResultType)
{
}

FileInfoResult::~FileInfoResult()
{
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
