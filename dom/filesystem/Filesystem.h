/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_filesystem_h__
#define mozilla_dom_filesystem_h__

#include "nsCOMPtr.h"
#include "nsAutoPtr.h"

class nsPIDOMWindow;

namespace mozilla {

class ErrorResult;

namespace dom {

class Promise;
class FilesystemParameters;

namespace filesystem {

class PathManager;

class Filesystem MOZ_FINAL
{
public:
  NS_IMETHOD_(nsrefcnt) AddRef(void);
  NS_IMETHOD_(nsrefcnt) Release(void);

private:
  nsAutoRefCnt mRefCnt;
  NS_DECL_OWNINGTHREAD

public:
  Filesystem(nsPIDOMWindow* aWindow, const nsAString& aBase);
  ~Filesystem();

  static nsRefPtr<Promise>
  GetFilesystem(nsPIDOMWindow* aWindow, const FilesystemParameters& parameters, ErrorResult& aRv);

  static void ShutdownAll();
  void Shutdown();

  nsPIDOMWindow* GetWindow();
  PathManager* GetPathManager();

private:
  static nsRefPtr<Filesystem> sFilesystem;

  nsCOMPtr<nsPIDOMWindow> mWindow;
  nsRefPtr<PathManager> mPathManager;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla

#endif // mozilla_dom_filesystem_h__
