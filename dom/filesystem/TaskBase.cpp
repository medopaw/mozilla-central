/*
 * TaskBase.cpp
 *
 *  Created on: Sep 29, 2013
 *      Author: yuan
 */

#include "TaskBase.h"
#include "FilesystemRequestParent.h"

#include "nsXULAppAPI.h"
#include "mozilla/dom/FilesystemBinding.h"
#include "mozilla/dom/ContentChild.h"
#include "mozilla/unused.h"
#include "mozilla/dom/Promise.h"

namespace mozilla {
namespace dom {
namespace filesystem {

TaskBase::TaskBase()
{
}

TaskBase::TaskBase(FilesystemRequestParent* aParent)
  : mRequestParent(aParent)
{
}

TaskBase::~TaskBase()
{
  // TODO Auto-generated destructor stub
}

already_AddRefed<Promise>
TaskBase::GetPromise(ErrorResult& aRv)
{
  return nsRefPtr<Promise>(mPromise).forget();
}

void
TaskBase::Start()
{
  MOZ_ASSERT(NS_IsMainThread(), "Only call on main thread!");

  if (XRE_GetProcessType() == GeckoProcessType_Default) {
    // Run in parent process.
    if (!mWorkerThread) {
      nsresult rv = NS_NewThread(getter_AddRefs(mWorkerThread));
      if (NS_FAILED(rv) ) {
        mWorkerThread = nullptr;
        // call error callback
        SetError(rv);
        HandleResult();
        return;
      }
      // Start worker thread
      mWorkerThread->Dispatch(this, NS_DISPATCH_NORMAL);
    }
  } else {
    // Run in child process.
    ContentChild::GetSingleton()->SendPFilesystemRequestConstructor(this,
      GetRequestParams());
  }
}

NS_IMETHODIMP
TaskBase::Run()
{
  if (!NS_IsMainThread()) {
    // Run worker thread tasks
    Work();
    // Dispatch itself to main thread
    NS_DispatchToMainThread(this);
  } else {
    // Shutdown mWorkerThread
    if (mWorkerThread) {
      mWorkerThread->Shutdown();
    }
    mWorkerThread = nullptr;
    // Run main thread tasks: call callbacks
    HandleResult();
  }

  return NS_OK;
}

void
TaskBase::HandleResult()
{
  if (mRequestParent) {
    MOZ_ASSERT(mParent, "mParent is null!");
    unused << mRequestParent->Send__delete__(mRequestParent, GetRequestResult());
  } else {
    HandlerCallback();
  }
}

bool
TaskBase::Recv__delete__(const FilesystemResponseValue& aValue)
{
  SetRequestResult(aValue);
  HandlerCallback();
  return true;
}

void
TaskBase::SetError(const nsAString& aErrorName)
{
}

void
TaskBase::SetError(const nsresult& aErrorCode)
{
}

}
}
}
