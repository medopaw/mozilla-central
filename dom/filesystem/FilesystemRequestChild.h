/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "mozilla/dom/filesystem/PFilesystemRequestChild.h"

namespace mozilla {
namespace dom {
namespace filesystem {

class Filesystem;
class Finisher;

class FilesystemRequestChild:
  public PFilesystemRequestChild
{
public:
  FilesystemRequestChild();
  FilesystemRequestChild(Finisher* aFinisher);
  ~FilesystemRequestChild();

  virtual bool Recv__delete__(const FilesystemResponseValue& value);

private:
  nsRefPtr<Finisher> mFinisher;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla
